import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Statue } from "./types";

export function StatueDetailPage() {
  const { slug } = useParams();
  const [statue, setStatue] = useState<Statue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetch(`/api/statues/${slug}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(r.status === 404 ? "not found" : `${r.status}`);
        return r.json();
      })
      .then((data) => {
        if (!cancelled) setStatue(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const copy = async () => {
    if (!statue) return;
    await navigator.clipboard.writeText(statue.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  if (error) {
    return (
      <main className="wrap detail-empty">
        <h1>{error}</h1>
        <Link to="/marketplace">← back to marketplace</Link>
      </main>
    );
  }

  if (!statue) {
    return (
      <main className="wrap detail-empty">
        <p>loading…</p>
      </main>
    );
  }

  return (
    <main className="detail">
      <div className="wrap">
        <Link to="/marketplace" className="detail-back">
          ← marketplace
        </Link>
        <div className="detail-head">
          <h1 className="detail-title">{statue.title}</h1>
          <div className="detail-meta">
            <span>@{statue.authorName}</span>
            <span>·</span>
            <span>★ {statue.stars}</span>
          </div>
          <div className="detail-tags">
            {statue.tags.map((t) => (
              <span key={t} className="statue-tag">
                {t}
              </span>
            ))}
          </div>
        </div>
        <div className="detail-card">
          <div className="detail-card-head">
            <span className="detail-card-label">.chprc</span>
            <button className="detail-copy" onClick={copy}>
              {copied ? "copied" : "copy"}
            </button>
          </div>
          <pre className="detail-body">{statue.body}</pre>
        </div>
      </div>
    </main>
  );
}
