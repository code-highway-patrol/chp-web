import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Statue, StatueFile } from "./types";
import { getStatueBySlug } from "./statuesCatalog";
import { isSlugStarred, toggleSlugStarred } from "./localStarPreferences";

function formatLawJson(raw: string | object | undefined): string | null {
  if (raw == null) return null;
  if (typeof raw === "object") {
    try {
      return JSON.stringify(raw, null, 2);
    } catch {
      return null;
    }
  }
  if (!raw.trim()) return null;
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function StatueDetailPage() {
  const { slug } = useParams();
  const [favTick, setFavTick] = useState(0);

  const statue = useMemo((): Statue | null => {
    if (!slug) return null;
    const row = getStatueBySlug(slug);
    if (!row) return null;
    void favTick;
    return { ...row, hasStarred: isSlugStarred(slug) };
  }, [slug, favTick]);

  const toggleStar = () => {
    if (!statue) return;
    toggleSlugStarred(statue.slug);
    setFavTick((x) => x + 1);
  };

  if (!slug) {
    return (
      <main className="wrap detail-empty">
        <p>loading…</p>
      </main>
    );
  }

  if (statue === null) {
    return (
      <main className="wrap detail-empty">
        <h1>{slug ? "not found" : "loading…"}</h1>
        {slug ? <Link to="/marketplace">← back to marketplace</Link> : null}
      </main>
    );
  }

  const isLawPack = Array.isArray(statue.files) && statue.files.length > 0;

  return (
    <main className="detail">
      <div className="wrap">
        <Link to="/marketplace" className="detail-back">
          ← marketplace
        </Link>
        <div className="detail-head">
          <h1 className="detail-title">
            {isLawPack && <span className="detail-folder">📁</span>}
            {statue.title}
          </h1>
          <div className="detail-meta">
            <span>@{statue.authorName}</span>
            {isLawPack && statue.laws && (
              <>
                <span>·</span>
                <span>
                  {statue.laws.length} {statue.laws.length === 1 ? "law" : "laws"}
                </span>
              </>
            )}
            <span>·</span>
            <button
              type="button"
              className={"detail-star" + (statue.hasStarred ? " starred" : "")}
              onClick={toggleStar}
              aria-pressed={statue.hasStarred}
              title="Saved on this device only"
            >
              <span className="detail-star-glyph">
                {statue.hasStarred ? "★" : "☆"}
              </span>
              <span>{statue.stars}</span>
            </button>
          </div>
          {statue.tags.length > 0 && (
            <div className="detail-tags">
              {statue.tags.map((t) => (
                <span key={t} className="statue-tag">
                  {t}
                </span>
              ))}
            </div>
          )}
          {statue.description && (
            <p className="detail-description">{statue.description}</p>
          )}
        </div>

        {isLawPack ? (
          <LawPackView statue={statue} />
        ) : (
          <LegacySingleView statue={statue} />
        )}
      </div>
    </main>
  );
}

// ── Law pack: file-tree explorer (multi-law statues) ──────────────────────

function LawPackView({ statue }: { statue: Statue }) {
  const files = statue.files ?? [];
  const defaultPath = useMemo(() => {
    return (
      files.find((f) => f.path.endsWith("/guidance.md"))?.path ??
      files.find((f) => f.path.endsWith("/law.json"))?.path ??
      files[0]?.path ??
      ""
    );
  }, [files]);
  const [activePath, setActivePath] = useState(defaultPath);
  useEffect(() => setActivePath(defaultPath), [defaultPath]);

  const active = files.find((f) => f.path === activePath);
  const tree = useMemo(() => buildTree(files), [files]);

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    if (!active) return;
    try {
      await navigator.clipboard.writeText(active.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  const installSnippet = useMemo(() => {
    return [
      `# install ${statue.slug} into your repo, from the repo root:`,
      ``,
      ...installCommands(statue.slug, files),
      ``,
      `# then register the new laws with CHP's hook registry:`,
      `bash ~/.chp/commands/chp-hooks register`,
    ].join("\n");
  }, [statue.slug, files]);

  const [installCopied, setInstallCopied] = useState(false);
  const copyInstall = async () => {
    try {
      await navigator.clipboard.writeText(installSnippet);
      setInstallCopied(true);
      setTimeout(() => setInstallCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <>
      <div className="lawpack-install">
        <div className="lawpack-install-head">
          <span>install into your repo</span>
          <button type="button" className="detail-copy" onClick={copyInstall}>
            {installCopied ? "copied" : "copy"}
          </button>
        </div>
        <pre className="lawpack-install-body">{installSnippet}</pre>
      </div>

      <div className="lawpack-explorer">
        <aside className="lawpack-tree">
          <div className="lawpack-tree-head">files</div>
          <FileTree node={tree} activePath={activePath} onSelect={setActivePath} />
        </aside>
        <section className="lawpack-viewer">
          <div className="lawpack-viewer-head">
            <span className="lawpack-viewer-path">{activePath || "—"}</span>
            <button
              type="button"
              className="detail-copy"
              onClick={copy}
              disabled={!active}
            >
              {copied ? "copied" : "copy"}
            </button>
          </div>
          {active ? (
            <FileBody file={active} />
          ) : (
            <div className="lawpack-empty">select a file</div>
          )}
        </section>
      </div>
    </>
  );
}

// Generates a deterministic bash one-liner per file. Heredocs are quoted to
// suppress shell expansion in case the law content contains $ or backticks.
function installCommands(slug: string, files: StatueFile[]): string[] {
  const out: string[] = [];
  const folders = new Set<string>();
  for (const f of files) {
    const dir = f.path.includes("/")
      ? f.path.slice(0, f.path.lastIndexOf("/"))
      : "";
    if (dir && !folders.has(dir)) {
      out.push(`mkdir -p docs/chp/laws/${dir}`);
      folders.add(dir);
    }
  }
  for (const f of files) {
    const heredoc = `STATUE_${slug.replace(/[^A-Z0-9]/gi, "_").toUpperCase()}_EOF`;
    out.push(`cat > docs/chp/laws/${f.path} <<'${heredoc}'`);
    out.push(f.content.replace(/\n+$/, ""));
    out.push(heredoc);
    if (f.path.endsWith(".sh")) {
      out.push(`chmod +x docs/chp/laws/${f.path}`);
    }
  }
  return out;
}

// ── Legacy single-law (backwards compat with body + lawJson statues) ──────

function LegacySingleView({ statue }: { statue: Statue }) {
  const [copied, setCopied] = useState<null | "guidance" | "law">(null);
  const lawFormatted = useMemo(
    () => formatLawJson(statue.lawJson),
    [statue.lawJson],
  );

  const copyGuidance = async () => {
    if (!statue.body) return;
    try {
      await navigator.clipboard.writeText(statue.body);
      setCopied("guidance");
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked */
    }
  };
  const copyLaw = async () => {
    if (statue.lawJson == null || statue.lawJson === "") return;
    const text =
      lawFormatted ??
      (typeof statue.lawJson === "string"
        ? statue.lawJson
        : JSON.stringify(statue.lawJson, null, 2));
    try {
      await navigator.clipboard.writeText(text);
      setCopied("law");
      setTimeout(() => setCopied(null), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <>
      <div className="detail-card">
        <div className="detail-card-head">
          <span className="detail-card-label">guidance.md</span>
          <button type="button" className="detail-copy" onClick={copyGuidance}>
            {copied === "guidance" ? "copied" : "copy"}
          </button>
        </div>
        <pre className="detail-body">{statue.body ?? ""}</pre>
      </div>
      {lawFormatted != null ? (
        <div className="detail-card">
          <div className="detail-card-head">
            <span className="detail-card-label">law.json</span>
            <button type="button" className="detail-copy" onClick={copyLaw}>
              {copied === "law" ? "copied" : "copy"}
            </button>
          </div>
          <pre className="detail-body detail-body-json">{lawFormatted}</pre>
        </div>
      ) : (
        <p className="detail-law-missing">
          This listing has no <code>law.json</code> payload. Add a string{" "}
          <code>lawJson</code> field in <code>statues.json</code> for this
          slug.
        </p>
      )}
    </>
  );
}

// ── File tree (recursive) ─────────────────────────────────────────────────

type TreeNode = {
  name: string;
  path: string;
  isFile: boolean;
  children: TreeNode[];
};

function buildTree(files: StatueFile[]): TreeNode {
  const root: TreeNode = { name: "", path: "", isFile: false, children: [] };
  for (const f of files) {
    const segs = f.path.split("/");
    let cur = root;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      const isLast = i === segs.length - 1;
      const path = segs.slice(0, i + 1).join("/");
      let next = cur.children.find((c) => c.name === seg);
      if (!next) {
        next = { name: seg, path, isFile: isLast, children: [] };
        cur.children.push(next);
      }
      cur = next;
    }
  }
  const sortRec = (n: TreeNode) => {
    n.children.sort((a, b) => {
      if (a.isFile !== b.isFile) return a.isFile ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
    n.children.forEach(sortRec);
  };
  sortRec(root);
  return root;
}

function FileTree({
  node,
  activePath,
  onSelect,
  depth = 0,
}: {
  node: TreeNode;
  activePath: string;
  onSelect: (p: string) => void;
  depth?: number;
}) {
  return (
    <ul className="tree-list" style={{ paddingLeft: depth === 0 ? 0 : 14 }}>
      {node.children.map((c) => (
        <TreeItem
          key={c.path}
          node={c}
          activePath={activePath}
          onSelect={onSelect}
          depth={depth}
        />
      ))}
    </ul>
  );
}

function TreeItem({
  node,
  activePath,
  onSelect,
  depth,
}: {
  node: TreeNode;
  activePath: string;
  onSelect: (p: string) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  if (node.isFile) {
    const active = node.path === activePath;
    return (
      <li>
        <button
          type="button"
          className={"tree-file" + (active ? " active" : "")}
          onClick={() => onSelect(node.path)}
        >
          <span className="tree-icon">{fileIcon(node.name)}</span>
          <span className="tree-name">{node.name}</span>
        </button>
      </li>
    );
  }
  return (
    <li>
      <button
        type="button"
        className={"tree-folder" + (open ? " open" : "")}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="tree-chev">{open ? "▾" : "▸"}</span>
        <span className="tree-icon">📁</span>
        <span className="tree-name">{node.name}</span>
      </button>
      {open && (
        <FileTree
          node={node}
          activePath={activePath}
          onSelect={onSelect}
          depth={depth + 1}
        />
      )}
    </li>
  );
}

function fileIcon(name: string): string {
  if (name === "law.json") return "⚖";
  if (name === "verify.sh") return "✓";
  if (name === "guidance.md") return "📄";
  return "·";
}

function FileBody({ file }: { file: StatueFile }) {
  if (file.path.endsWith(".json")) {
    let pretty = file.content;
    try {
      pretty = JSON.stringify(JSON.parse(file.content), null, 2);
    } catch {
      /* keep raw if not parseable */
    }
    return <pre className="file-body file-json">{pretty}</pre>;
  }
  return <pre className="file-body">{file.content}</pre>;
}
