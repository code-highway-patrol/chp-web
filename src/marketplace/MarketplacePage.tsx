import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Statue } from "./types";

export function MarketplacePage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Statue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    setError(null);

    const trimmed = query.trim();
    const t = setTimeout(async () => {
      try {
        const res = trimmed
          ? await fetch("/api/statues/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: trimmed }),
            })
          : await fetch("/api/statues");
        if (!res.ok) throw new Error(`${res.status}`);
        const data = await res.json();
        if (id !== reqId.current) return;
        setItems(data.items ?? []);
      } catch (err) {
        if (id !== reqId.current) return;
        setError(err instanceof Error ? err.message : "failed to load");
      } finally {
        if (id === reqId.current) setLoading(false);
      }
    }, trimmed ? 280 : 0);

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
          Statues are .chprc rule packs the community wrote. Drop one in your
          repo and CHP starts enforcing it on every agent turn.
        </p>
        <div className="market-search">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="describe what you want to enforce…"
            className="market-search-input"
            autoFocus
          />
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
      </div>
    </main>
  );
}

function StatueCard({ statue }: { statue: Statue }) {
  const blurb = firstParagraph(statue.body);
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

function firstParagraph(body: string): string {
  const lines = body.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
  const text = lines.slice(0, 3).join(" ").replace(/^-\s*/gm, "");
  return text.length > 180 ? text.slice(0, 180) + "…" : text;
}
