import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, authedFetch } from "../auth/useAuth";
import { invalidateCatalog } from "./statuesCatalog";
import {
  validatePublishPayload,
  type StatueFile,
  type ValidationResult,
} from "./validateStatue";
import type { Statue } from "./types";

// ── Reading dropped folders / files ─────────────────────────────────────────

async function readEntry(entry: FileSystemEntry, prefix = ""): Promise<StatueFile[]> {
  if (entry.isFile) {
    const file = await new Promise<File>((resolve, reject) =>
      (entry as FileSystemFileEntry).file(resolve, reject),
    );
    const text = await file.text();
    return [{ path: prefix + entry.name, content: text, size: file.size }];
  }
  const dir = entry as FileSystemDirectoryEntry;
  const reader = dir.createReader();
  const out: StatueFile[] = [];
  // Directory readers are paginated — keep calling readEntries until empty.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
      reader.readEntries(resolve, reject),
    );
    if (batch.length === 0) break;
    for (const child of batch) {
      const more = await readEntry(child, `${prefix}${entry.name}/`);
      out.push(...more);
    }
  }
  return out;
}

async function readDataTransfer(items: DataTransferItemList): Promise<StatueFile[]> {
  const out: StatueFile[] = [];
  // DataTransferItemList iteration is awkward; collect entries first.
  const entries: FileSystemEntry[] = [];
  for (let i = 0; i < items.length; i++) {
    const e = items[i].webkitGetAsEntry();
    if (e) entries.push(e);
  }
  for (const e of entries) {
    const files = await readEntry(e);
    out.push(...files);
  }
  return out;
}

async function readFileList(list: FileList): Promise<StatueFile[]> {
  const out: StatueFile[] = [];
  for (let i = 0; i < list.length; i++) {
    const f = list.item(i);
    if (!f) continue;
    // input[webkitdirectory] populates webkitRelativePath with "<root>/path".
    const path = (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;
    const text = await f.text();
    out.push({ path, content: text, size: f.size });
  }
  return out;
}

// Hidden / OS noise files we never want to publish.
const IGNORE_BASENAMES = new Set([".DS_Store", "Thumbs.db", ".gitkeep"]);
function dropNoise(files: StatueFile[]): StatueFile[] {
  return files.filter((f) => {
    const segs = f.path.split("/");
    if (segs.some((s) => s.startsWith("."))) return false;
    return !IGNORE_BASENAMES.has(segs[segs.length - 1]);
  });
}

// If every path shares a top-level segment AND stripping it leaves a
// well-shaped tree (every remaining path is either ≥2 segments or a root
// README), strip one level. Retry up to `max` times so a wrapped layout
// like `docs/chp/laws/my-pack/<law>/...` normalizes to `<law>/...`.
function stripCommonRoots(files: StatueFile[], max = 4): StatueFile[] {
  let current = files;
  for (let i = 0; i < max; i++) {
    if (current.length === 0) return current;
    const partsList = current.map((f) => f.path.split("/").filter(Boolean));
    if (partsList.some((p) => p.length < 2)) return current;
    const head = partsList[0][0];
    if (!partsList.every((p) => p[0] === head)) return current;
    const next = current.map((f, idx) => ({
      ...f,
      path: partsList[idx].slice(1).join("/"),
    }));
    // Refuse to strip if the result would have any 1-segment non-README path —
    // that means the user dropped a single law dir and stripping its name
    // would collapse files to bare basenames the validator can't make sense of.
    const wouldMangle = next.some((f) => {
      const s = f.path.split("/").filter(Boolean);
      return s.length === 1 && !/^readme\.md$/i.test(s[0]);
    });
    if (wouldMangle) return current;
    current = next;
  }
  return current;
}

// Try to find a normalization where the validator is happy. Tests both as-is
// and with progressively stripped roots, returning the first shape that
// validates as a publishable statue (or, if nothing validates, the as-is one
// for clearer error messaging).
function normalizeForUpload(files: StatueFile[]): {
  files: StatueFile[];
  validation: ValidationResult;
} {
  const cleaned = dropNoise(files);
  const candidates: StatueFile[][] = [cleaned];
  let acc = cleaned;
  for (let i = 0; i < 4; i++) {
    const next = stripCommonRoots(acc, 1);
    if (next.length === 0 || next === acc) break;
    if (JSON.stringify(next) === JSON.stringify(acc)) break;
    candidates.push(next);
    acc = next;
  }

  for (const cand of candidates) {
    const r = validatePublishPayload({ title: "x", files: cand });
    if (r.ok) return { files: cand, validation: r };
  }
  // None validated — return the most-stripped variant for the cleanest error.
  return {
    files: candidates[candidates.length - 1] ?? cleaned,
    validation: validatePublishPayload({ title: "x", files: candidates[candidates.length - 1] ?? cleaned }),
  };
}

function readme(files: StatueFile[]): string | undefined {
  const r = files.find((f) => /^readme\.md$/i.test(f.path));
  return r?.content;
}

function lawNames(files: StatueFile[]): string[] {
  const set = new Set<string>();
  for (const f of files) {
    const segs = f.path.split("/").filter(Boolean);
    if (segs.length === 2) set.add(segs[0]);
  }
  return [...set].sort();
}

// ── Component ───────────────────────────────────────────────────────────────

export function NewStatuePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [files, setFiles] = useState<StatueFile[] | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Stop the browser from navigating away if the drop misses our zone.
    const block = (e: DragEvent) => e.preventDefault();
    window.addEventListener("dragover", block);
    window.addEventListener("drop", block);
    return () => {
      window.removeEventListener("dragover", block);
      window.removeEventListener("drop", block);
    };
  }, []);

  if (authLoading) {
    return (
      <main className="wrap detail-empty">
        <p>loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="wrap detail-empty">
        <h1>sign in to publish</h1>
        <p className="market-sub">
          Publishing a statue is auth-gated so the catalog can attribute work
          to you.
        </p>
        <Link to="/auth" className="btn">Sign in →</Link>
      </main>
    );
  }

  const ingestRaw = (raw: StatueFile[]) => {
    if (raw.length === 0) {
      setFiles(null);
      setValidation({ ok: false, error: "no files received" });
      return;
    }
    const { files: normalized, validation: v } = normalizeForUpload(raw);
    setFiles(normalized);
    setValidation(v);
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    setErr(null);
    try {
      const items = e.dataTransfer.items;
      const got = items && items.length > 0
        ? await readDataTransfer(items)
        : await readFileList(e.dataTransfer.files);
      ingestRaw(got);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "couldn't read drop");
    }
  };

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list) return;
    setErr(null);
    try {
      const got = await readFileList(list);
      ingestRaw(got);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "couldn't read files");
    }
  };

  const reset = () => {
    setFiles(null);
    setValidation(null);
    setTitle("");
    setDescription("");
    setTagsRaw("");
    setErr(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !files || !validation?.ok) return;
    setErr(null);
    setSubmitting(true);

    try {
      const md = readme(files);
      const lawFiles = files.filter((f) => f.path !== "README.md" && f.path !== "readme.md");

      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        tags: tagsRaw.split(",").map((s) => s.trim()).filter(Boolean),
        files: lawFiles,
      };
      if (md) payload.readme = md;

      const finalCheck = validatePublishPayload(payload as { title: string; files: StatueFile[] });
      if (!finalCheck.ok) throw new Error(finalCheck.error);

      const res = await authedFetch("/api/statues", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const created = (await res.json()) as Statue;
      invalidateCatalog();
      navigate(`/marketplace/${created.slug}`);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "publish failed");
    } finally {
      setSubmitting(false);
    }
  };

  const ready = files !== null && validation?.ok === true;

  return (
    <main className="new-statue">
      <div className="wrap">
        <Link to="/marketplace" className="detail-back">← marketplace</Link>
        <h1 className="detail-title">Publish a statue</h1>
        <p className="market-sub" style={{ maxWidth: 720 }}>
          Drop a folder containing your law(s). Each law must be its own
          subfolder with all three files: <code>law.json</code>,{" "}
          <code>verify.sh</code>, <code>guidance.md</code>. Anything else
          (other filenames, files outside a law folder, hidden dotfiles)
          gets rejected. A root <code>README.md</code> is allowed and
          surfaces in the marketplace as the pack's overview.
        </p>

        {!files ? (
          <DropZone
            dragOver={dragOver}
            setDragOver={setDragOver}
            onDrop={onDrop}
            onPick={() => fileInput.current?.click()}
          />
        ) : (
          <ParsedPreview
            files={files}
            validation={validation}
            onReset={reset}
          />
        )}

        <input
          ref={fileInput}
          type="file"
          multiple
          // @ts-expect-error — non-standard but supported by Chromium and WebKit
          webkitdirectory=""
          directory=""
          style={{ display: "none" }}
          onChange={onPickFiles}
        />

        {ready && (
          <form className="new-statue-form" onSubmit={submit}>
            <div className="new-field">
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={`e.g. "${lawNames(files).slice(0, 3).join(", ") || "Block eval"}"`}
                required
              />
            </div>
            <div className="new-field">
              <span>Description</span>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short blurb shown on the marketplace card"
              />
            </div>
            <div className="new-field">
              <span>Tags <em>(comma-separated, up to 12)</em></span>
              <input
                type="text"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                placeholder="security, javascript"
              />
            </div>

            {err && <div className="market-error">{err}</div>}

            <div className="new-actions">
              <button type="button" className="btn btn-ghost" onClick={reset} disabled={submitting}>
                Start over
              </button>
              <button type="submit" className="btn" disabled={submitting || !title.trim()}>
                {submitting ? "Publishing…" : "Publish"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}

function DropZone({
  dragOver,
  setDragOver,
  onDrop,
  onPick,
}: {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onPick: () => void;
}) {
  return (
    <div
      className={"upload-zone" + (dragOver ? " drag" : "")}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={onPick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPick();
        }
      }}
    >
      <div className="upload-zone-icon" aria-hidden>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M12 11v6" />
          <path d="M9 14l3-3 3 3" />
        </svg>
      </div>
      <div className="upload-zone-title">Drop a folder of laws here</div>
      <div className="upload-zone-sub">
        or click to browse · expected: <code>&lt;law-name&gt;/&#123;law.json,verify.sh,guidance.md&#125;</code>
      </div>
    </div>
  );
}

function ParsedPreview({
  files,
  validation,
  onReset,
}: {
  files: StatueFile[];
  validation: ValidationResult | null;
  onReset: () => void;
}) {
  const tree = useMemo(() => buildSimpleTree(files), [files]);
  const laws = lawNames(files);
  const hasReadme = files.some((f) => /^readme\.md$/i.test(f.path));

  return (
    <div className="upload-preview">
      <div className="upload-preview-head">
        <div>
          <div className="upload-preview-title">
            {files.length} files parsed · {laws.length} law{laws.length === 1 ? "" : "s"}
            {hasReadme && " · README.md"}
          </div>
          <div className="upload-preview-sub">
            {validation?.ok ? (
              <span className="upload-ok">structure looks good — fill in the metadata below</span>
            ) : (
              <span className="upload-bad">{validation?.error ?? "invalid structure"}</span>
            )}
          </div>
        </div>
        <button type="button" className="btn btn-ghost" onClick={onReset}>Drop different files</button>
      </div>
      <pre className="upload-preview-tree">{renderTree(tree)}</pre>
    </div>
  );
}

type Node = { name: string; children: Map<string, Node>; isFile: boolean };
function buildSimpleTree(files: StatueFile[]): Node {
  const root: Node = { name: "", children: new Map(), isFile: false };
  for (const f of files) {
    const segs = f.path.split("/").filter(Boolean);
    let cur = root;
    for (let i = 0; i < segs.length; i++) {
      const last = i === segs.length - 1;
      const seg = segs[i];
      if (!cur.children.has(seg)) {
        cur.children.set(seg, { name: seg, children: new Map(), isFile: last });
      }
      cur = cur.children.get(seg)!;
    }
  }
  return root;
}
function renderTree(node: Node, depth = 0): string {
  const lines: string[] = [];
  const sorted = [...node.children.values()].sort((a, b) => {
    if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
    return a.name.localeCompare(b.name);
  });
  for (const child of sorted) {
    const indent = "  ".repeat(depth);
    const icon = child.isFile ? "📄" : "📁";
    lines.push(`${indent}${icon} ${child.name}`);
    if (!child.isFile) lines.push(renderTree(child, depth + 1));
  }
  return lines.filter(Boolean).join("\n");
}
