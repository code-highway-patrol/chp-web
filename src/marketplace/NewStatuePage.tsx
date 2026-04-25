import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, authedFetch } from "../auth/useAuth";

export function NewStatuePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [loading, user, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const tagList = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const res = await authedFetch("/api/statues", {
      method: "POST",
      body: JSON.stringify({
        title,
        body,
        tags: tagList,
        authorName: user?.user_metadata?.user_name ?? user?.email?.split("@")[0],
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? `failed (${res.status})`);
      setSubmitting(false);
      return;
    }

    const created = await res.json();
    navigate(`/marketplace/${created.slug}`);
  };

  if (loading || !user) {
    return (
      <main className="wrap detail-empty">
        <p>loading…</p>
      </main>
    );
  }

  return (
    <main className="new-statue">
      <div className="wrap">
        <Link to="/marketplace" className="detail-back">
          ← marketplace
        </Link>
        <h1 className="detail-title">Publish a statue</h1>
        <p className="market-sub" style={{ maxWidth: 640 }}>
          Statues are .chprc rule packs. Plain English bullets work best — CHP
          will enforce them on every agent turn for whoever installs your pack.
        </p>
        <form onSubmit={submit} className="new-statue-form">
          <label className="new-field">
            <span>Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={80}
              placeholder="e.g. No console.log in committed code"
            />
          </label>
          <label className="new-field">
            <span>Tags (comma separated)</span>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="typescript, hooks, async"
            />
          </label>
          <label className="new-field">
            <span>.chprc body</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={14}
              placeholder={"# my-rules\n- rule one\n- rule two"}
            />
          </label>
          {error && <div className="market-error">{error}</div>}
          <div className="new-actions">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? "publishing…" : "publish"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
