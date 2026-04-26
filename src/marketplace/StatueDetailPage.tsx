import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import type { Statue } from "./types";
import { useAuth, authedFetch } from "../auth/useAuth";

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
  const navigate = useNavigate();
  const { user, session } = useAuth();
  const [statue, setStatue] = useState<Statue | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<null | "guidance" | "law">(null);
  const [starring, setStarring] = useState(false);

  const lawFormatted = useMemo(
    () => (statue ? formatLawJson(statue.lawJson) : null),
    [statue],
  );

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    authedFetch(`/api/statues/${slug}`)
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
  }, [slug, session?.access_token]);

  const copyGuidance = async () => {
    if (!statue) return;
    await navigator.clipboard.writeText(statue.body);
    setCopied("guidance");
    setTimeout(() => setCopied(null), 1600);
  };

  const copyLaw = async () => {
    if (statue?.lawJson == null || statue.lawJson === "") return;
    const text =
      lawFormatted ??
      (typeof statue.lawJson === "string"
        ? statue.lawJson
        : JSON.stringify(statue.lawJson, null, 2));
    await navigator.clipboard.writeText(text);
    setCopied("law");
    setTimeout(() => setCopied(null), 1600);
  };

  const toggleStar = async () => {
    if (!statue) return;
    if (!user) {
      navigate("/auth");
      return;
    }
    if (starring) return;
    setStarring(true);
    const res = await authedFetch(`/api/statues/${statue.slug}/star`, {
      method: "POST",
    });
    if (res.ok) {
      const data = await res.json();
      setStatue({ ...statue, hasStarred: data.hasStarred, stars: data.stars });
    }
    setStarring(false);
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
            <button
              className={"detail-star" + (statue.hasStarred ? " starred" : "")}
              onClick={toggleStar}
              disabled={starring}
              aria-pressed={statue.hasStarred}
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
            <button className="detail-copy" onClick={copyGuidance}>
              {copied === "guidance" ? "copied" : "copy"}
            </button>
          </div>
          <pre className="detail-body">{statue.body}</pre>
        </div>
        {lawFormatted != null ? (
          <div className="detail-card">
            <div className="detail-card-head">
              <span className="detail-card-label">law.json</span>
              <button className="detail-copy" onClick={copyLaw}>
                {copied === "law" ? "copied" : "copy"}
              </button>
            </div>
            <pre className="detail-body detail-body-json">{lawFormatted}</pre>
          </div>
        ) : (
          <p className="detail-law-missing">
            This listing has no <code>law.json</code> payload (older publish).
            Republish with both guidance and JSON to match on-disk CHP layout.
          </p>
        )}
      </div>
    </main>
  );
}
