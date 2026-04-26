import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Statue, StatueFile } from "./types";
import { getStatueBySlug } from "./statuesCatalog";
import { isSlugStarred, toggleSlugStarred } from "./localStarPreferences";
import { ClientPicker } from "../ClientPicker";
import type { ClientId } from "../clients";

function installCommand(client: ClientId, slug: string): string {
  if (client === "claude") return `/chp install ${slug}`;
  return `chp install ${slug}`;
}

function formatLawJson(raw: string | object): string {
  if (typeof raw === "object") return JSON.stringify(raw, null, 2);
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

// Legacy statues store a single law as body + lawJson. To render them in the
// same file-tree explorer as law packs, synthesize the on-disk shape:
//   <slug>/guidance.md, <slug>/law.json
function statueFiles(statue: Statue): StatueFile[] {
  if (Array.isArray(statue.files) && statue.files.length > 0) return statue.files;
  const out: StatueFile[] = [];
  if (statue.body && statue.body.trim()) {
    out.push({
      path: `${statue.slug}/guidance.md`,
      content: statue.body,
      size: statue.body.length,
    });
  }
  if (statue.lawJson != null && statue.lawJson !== "") {
    const content = formatLawJson(statue.lawJson);
    out.push({
      path: `${statue.slug}/law.json`,
      content,
      size: content.length,
    });
  }
  return out;
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

  const files = statueFiles(statue);
  const lawCount = statue.laws?.length ?? (files.some((f) => f.path.endsWith("/law.json")) ? 1 : 0);

  return (
    <main className="detail">
      <div className="wrap">
        <Link to="/marketplace" className="detail-back">
          ← marketplace
        </Link>
        <div className="detail-head">
          <h1 className="detail-title">
            <span className="detail-folder">📁</span>
            {statue.title}
          </h1>
          <div className="detail-meta">
            <span>@{statue.authorName}</span>
            {lawCount > 0 && (
              <>
                <span>·</span>
                <span>
                  {lawCount} {lawCount === 1 ? "law" : "laws"}
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

        <ExplorerView slug={statue.slug} files={files} />
      </div>
    </main>
  );
}

function ExplorerView({ slug, files }: { slug: string; files: StatueFile[] }) {
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

  return (
    <>
      <InstallPanel slug={slug} />

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

function InstallPanel({ slug }: { slug: string }) {
  const [client, setClient] = useState<ClientId>("claude");
  const [copied, setCopied] = useState(false);
  const cmd = installCommand(client, slug);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="statue-install">
      <div className="statue-install-head">
        <span className="statue-install-label">install</span>
        <ClientPicker value={client} onChange={setClient} />
      </div>
      <div className="statue-install-row">
        <span className="statue-install-prompt">
          {client === "claude" ? ">" : "$"}
        </span>
        <code className="statue-install-cmd">{cmd}</code>
        <button type="button" className="detail-copy" onClick={copy}>
          {copied ? "copied" : "copy"}
        </button>
      </div>
    </div>
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
