import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Statue } from "./types";
import { ClientPicker } from "../ClientPicker";
import { InstallCmd } from "../InstallCmd";
import type { ClientId } from "../clients";

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

  const loadFirstPage = (q: string) => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);
    setSkip(0);

    const trimmed = q.trim();
    (async () => {
      try {
        const res = trimmed
          ? await fetch("/api/statues/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: trimmed }),
            })
          : await fetch(`/api/statues?limit=${PAGE_SIZE}&skip=0`);
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        if (id !== reqId.current) return;
        setItems(data.items ?? []);
        setHasMore(trimmed ? false : !!data.hasMore);
      } catch (err) {
        if (id !== reqId.current) return;
        setError(err instanceof Error ? err.message : "failed to load");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    })();
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextSkip = skip + PAGE_SIZE;
    try {
      const res = await fetch(`/api/statues?limit=${PAGE_SIZE}&skip=${nextSkip}`);
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setItems((prev) => [...prev, ...(data.items ?? [])]);
      setHasMore(!!data.hasMore);
      setSkip(nextSkip);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to load");
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => loadFirstPage(query), query.trim() ? 280 : 0);
    return () => clearTimeout(t);
  }, [query]);

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
          <code>verify.sh</code>. Publishing here requires both the guidance
          markdown and the JSON together (same as that folder pair). Statues
          are shareable copies you can drop into your repo.
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
                if (e.key === "Enter") loadFirstPage(query);
              }}
              placeholder="describe what you want to enforce…"
              className="market-search-input"
              autoFocus
            />
            <span className="market-search-kbd" aria-hidden>
              {query.trim() ? "↵" : "press ↵ to search"}
            </span>
          </div>
          <Link className="btn market-publish" to="/marketplace/new">
            Publish
          </Link>
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
  const blurb = firstParagraph(statue);
  return (
    <Link className="statue-card" to={`/marketplace/${statue.slug}`}>
      <div className="statue-card-head">
        <div className="statue-card-title">{statue.title}</div>
        <div className="statue-card-stars">★ {statue.stars}</div>
      </div>
      <div className="statue-card-blurb">{blurb}</div>
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
  const lines = statue.body
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("#"));
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
