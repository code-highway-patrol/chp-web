import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Statue, StatueFile } from "./types";
import { getStatueBySlug } from "./statuesCatalog";
import { isSlugStarred, toggleSlugStarred } from "./localStarPreferences";
import { recordStar } from "./starsApi";
import { ClientPicker } from "../ClientPicker";
import type { ClientId } from "../clients";
import { VirusTotalBadge } from "./VirusTotalBadge";
import { Markdown } from "./Markdown";

function installCommand(_client: ClientId, slug: string): string {
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

// Files whose path is purely informational and not part of the install set.
// `chp install` should skip these on disk; the explorer still shows them.
function isInfoFile(path: string): boolean {
  const base = path.split("/").pop() ?? path;
  return base.toLowerCase() === "readme.md";
}

// Legacy statues store a single law as body + lawJson. To render them in the
// same file-tree explorer as law packs, synthesize the on-disk shape:
//   <slug>/guidance.md, <slug>/law.json
function statueFiles(statue: Statue): StatueFile[] {
  const out: StatueFile[] = [];
  if (statue.readme && statue.readme.trim()) {
    out.push({
      path: "README.md",
      content: statue.readme,
      size: statue.readme.length,
    });
  }
  if (Array.isArray(statue.files) && statue.files.length > 0) {
    return [...out, ...statue.files];
  }
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
  const [row, setRow] = useState<Statue | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setStatus("loading");
    getStatueBySlug(slug)
      .then((found) => {
        if (cancelled) return;
        if (!found) {
          setRow(null);
          setStatus("missing");
        } else {
          setRow(found);
          setStatus("ready");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setErrMsg(err instanceof Error ? err.message : "failed to load");
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const statue = useMemo((): Statue | null => {
    if (!slug || !row) return null;
    void favTick;
    return { ...row, hasStarred: isSlugStarred(slug) };
  }, [slug, row, favTick]);

  const toggleStar = () => {
    if (!statue) return;
    const next = toggleSlugStarred(statue.slug);
    setFavTick((x) => x + 1);
    void recordStar(statue.slug, next);
  };

  if (!slug || status === "loading") {
    return (
      <main className="wrap detail-empty">
        <p>loading…</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="wrap detail-empty">
        <h1>couldn't load</h1>
        <p className="market-sub">{errMsg ?? "network error"}</p>
        <Link to="/marketplace">← back to marketplace</Link>
      </main>
    );
  }

  if (status === "missing" || !statue) {
    return (
      <main className="wrap detail-empty">
        <h1>not found</h1>
        <Link to="/marketplace">← back to marketplace</Link>
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
            <span className="detail-folder">
              <FolderIcon />
            </span>
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
              <span>{statue.stars + (statue.hasStarred ? 1 : 0)}</span>
            </button>
            <VirusTotalBadge slug={statue.slug} variant="detail" />
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
      files.find((f) => f.path === "README.md")?.path ??
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
            {active && isInfoFile(active.path) && (
              <span className="lawpack-info-badge" title="Not copied to your repo by chp install">
                info only
              </span>
            )}
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
          $
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
          <span className="tree-icon">
            <FileIcon name={node.name} />
          </span>
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
        <span className="tree-chev">
          <ChevronIcon open={open} />
        </span>
        <span className="tree-icon">
          <FolderIcon />
        </span>
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

const ICON_PROPS = {
  width: 14,
  height: 14,
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

function FolderIcon() {
  return (
    <svg {...ICON_PROPS} aria-hidden>
      <path d="M2 4.5a1 1 0 0 1 1-1h3.6a1 1 0 0 1 .7.3L8.8 5h4.2a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1z" />
    </svg>
  );
}

function FileIcon({ name }: { name: string }) {
  if (name.endsWith(".json")) {
    return (
      <svg {...ICON_PROPS} aria-hidden>
        <path d="M9.5 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5z" />
        <path d="M9.5 2v3.5H13" />
        <path d="M6 10.5c-.6 0-1 .3-1 1s.4 1 1 1h.3" />
        <path d="M10 10.5c.6 0 1 .3 1 1s-.4 1-1 1h-.3" />
        <path d="M8 10.5v2" />
      </svg>
    );
  }
  if (name.endsWith(".sh")) {
    return (
      <svg {...ICON_PROPS} aria-hidden>
        <rect x="2" y="3.5" width="12" height="9" rx="1.2" />
        <path d="M4.5 7l1.5 1.3L4.5 9.5" />
        <path d="M7.5 9.8h2.7" />
      </svg>
    );
  }
  if (name.endsWith(".md")) {
    return (
      <svg {...ICON_PROPS} aria-hidden>
        <rect x="2" y="3.5" width="12" height="9" rx="1.2" />
        <path d="M4.5 10V6l1.5 2 1.5-2v4" />
        <path d="M10 6.5v3.5M10 10l1-1M10 10l-1-1" />
      </svg>
    );
  }
  return (
    <svg {...ICON_PROPS} aria-hidden>
      <path d="M9.5 2H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5.5z" />
      <path d="M9.5 2v3.5H13" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      {...ICON_PROPS}
      style={{
        transform: open ? "rotate(90deg)" : "none",
        transition: "transform 140ms",
      }}
      aria-hidden
    >
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
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
  if (file.path.endsWith(".md")) {
    return (
      <div className="file-body file-md">
        <Markdown source={file.content} />
      </div>
    );
  }
  return <pre className="file-body">{file.content}</pre>;
}
