import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Statue } from "./types";
import { ClientPicker } from "../ClientPicker";
import { InstallCmd } from "../InstallCmd";
import type { ClientId } from "../clients";
import { listStatuesSorted, searchStatuesLocal } from "./statuesCatalog";

const PAGE_SIZE = 12;

export function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Statue[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<ClientId>("claude");
  const reqId = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runCatalogQuery = useCallback((immediate: boolean) => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    setSkip(0);

    const trimmed = query.trim();
    const delay = immediate ? 0 : trimmed ? 280 : 0;
    debounceTimer.current = window.setTimeout(() => {
      debounceTimer.current = null;
      if (id !== reqId.current) return;
      try {
        const pool = trimmed ? searchStatuesLocal(trimmed) : listStatuesSorted();
        const page = trimmed ? pool.slice(0, 24) : pool.slice(0, PAGE_SIZE);
        setItems(page);
        setHasMore(!trimmed && pool.length > PAGE_SIZE);
      } catch (err) {
        setError(err instanceof Error ? err.message : "failed to load");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, delay);
  }, [query]);

  useEffect(() => {
    queueMicrotask(() => runCatalogQuery(false));
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [runCatalogQuery]);

  const loadMore = () => {
    if (loadingMore || !hasMore || query.trim()) return;
    setLoadingMore(true);
    const nextSkip = skip + PAGE_SIZE;
    try {
      const pool = listStatuesSorted();
      const next = pool.slice(nextSkip, nextSkip + PAGE_SIZE);
      setItems((prev) => [...prev, ...next]);
      setHasMore(nextSkip + PAGE_SIZE < pool.length);
      setSkip(nextSkip);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load");
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <main className="market">
      <div className="wrap market-head">
        <div className="market-eyebrow">community statues</div>
        <h1 className="market-title">
          The rules your codebase
          <br />
          should already have.
        </h1>
        <p className="market-sub">
          CHP enforces custom laws from{" "}
          <code>docs/chp/laws/&lt;law-name&gt;/</code> — each folder has{" "}
          <code>guidance.md</code>, <code>law.json</code>, and{" "}
          <code>verify.sh</code>. The catalog below is shipped with this site
          (see <code>src/marketplace/statues.json</code>). Statues are shareable
          copies you can drop into your repo.
        </p>

        <div className="market-install">
          <ClientPicker value={client} onChange={setClient} />
          <InstallCmd client={client} />
        </div>
        <div className="market-install-req">
          requires <code>bash 4+</code> · macOS ships 3.2, install a newer
          one via <code>brew install bash</code>
        </div>

        <div className="market-search">
          <div className="market-search-wrap">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runCatalogQuery(true);
              }}
              placeholder="describe what you want to enforce…"
              className="market-search-input"
              autoFocus
            />
            <span className="market-search-kbd" aria-hidden>
              {query.trim() ? "↵" : "press ↵ to search"}
            </span>
          </div>
        </div>
      </div>
      <div className="wrap">
        {error && <div className="market-error">{error}</div>}
        {loading && items.length === 0 && (
          <div className="market-empty">loading…</div>
        )}
        {!loading && items.length === 0 && !error && (
          <div className="market-empty">no statues match that.</div>
        )}
        <div className="market-grid">
          {items.map((s) => (
            <StatueCard key={s.slug} statue={s} />
          ))}
        </div>
        {hasMore && !query.trim() && (
          <div className="market-loadmore">
            <button
              className="btn btn-ghost"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "loading…" : "load more"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function StatueCard({ statue }: { statue: Statue }) {
  const isLawPack = Array.isArray(statue.files) && statue.files.length > 0;
  const lawCount = isLawPack ? statue.laws?.length ?? 0 : 0;
  const blurb =
    statue.description ||
    firstParagraph(statue) ||
    (isLawPack && statue.laws
      ? statue.laws
          .slice(0, 3)
          .map((l) => l.name)
          .join(", ")
      : "");

  return (
    <Link
      className={`statue-card${isLawPack ? " statue-card-collection" : ""}`}
      to={`/marketplace/${statue.slug}`}
    >
      <div className="statue-card-head">
        <div className="statue-card-title">
          {isLawPack && <span className="statue-card-folder">📁</span>}
          {statue.title}
        </div>
        <div className="statue-card-stars">★ {statue.stars}</div>
      </div>
      <div className="statue-card-blurb">{blurb}</div>
      {isLawPack && lawCount > 0 && (
        <div className="statue-card-count">
          {lawCount} {lawCount === 1 ? "law" : "laws"}
        </div>
      )}
      <div className="statue-card-foot">
        <div className="statue-card-tags">
          {statue.tags.slice(0, 3).map((t) => (
            <span key={t} className="statue-tag">
              {t}
            </span>
          ))}
        </div>
        <div className="statue-card-author">@{statue.authorName}</div>
      </div>
    </Link>
  );
}

function firstParagraph(statue: Statue): string {
  const body = statue.body ?? "";
  const lines = body.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  const fromBody = lines
    .slice(0, 3)
    .join(" ")
    .replace(/^-\s*/gm, "");
  const fromLaw = statue.lawJson
    ? (() => {
        try {
          const o =
            typeof statue.lawJson === "string"
              ? (JSON.parse(statue.lawJson) as { intent?: string })
              : (statue.lawJson as { intent?: string });
          return typeof o.intent === "string" ? o.intent : "";
        } catch {
          return "";
        }
      })()
    : "";
  const text = [fromBody, fromLaw].filter(Boolean).join(" · ");
  return text.length > 180 ? text.slice(0, 180) + "…" : text;
}
