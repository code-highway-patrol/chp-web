import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { Statue } from "./types";
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

  const [copied, setCopied] = useState<null | "guidance" | "law">(null);

  const lawFormatted = useMemo(
    () => (statue ? formatLawJson(statue.lawJson) : null),
    [statue],
  );

  const copyGuidance = async () => {
    if (!statue) return;
    await navigator.clipboard.writeText(statue.body);
    setCopied("guidance");
    setTimeout(() => setCopied(null), 1600);
  };

  const copyLaw = async () => {
    if (!statue) return;
    if (statue.lawJson == null || statue.lawJson === "") return;
    const text =
      lawFormatted ??
      (typeof statue.lawJson === "string"
        ? statue.lawJson
        : JSON.stringify(statue.lawJson, null, 2));
    await navigator.clipboard.writeText(text);
    setCopied("law");
    setTimeout(() => setCopied(null), 1600);
  };

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
            <span className="detail-card-label">guidance.md</span>
            <button type="button" className="detail-copy" onClick={copyGuidance}>
              {copied === "guidance" ? "copied" : "copy"}
            </button>
          </div>
          <pre className="detail-body">{statue.body}</pre>
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
      </div>
    </main>
  );
}
