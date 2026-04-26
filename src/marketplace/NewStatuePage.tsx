import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, authedFetch } from "../auth/useAuth";
import { normalizeLawJsonInput } from "../../law-json-normalize";

const LAW_JSON_PLACEHOLDER = `{
  "name": "my-law",
  "intent": "One line describing what this law enforces",
  "severity": "error",
  "failures": 0,
  "tightening_level": 0,
  "hooks": ["pre-tool"],
  "enabled": true,
  "checks": []
}`;

export function NewStatuePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [lawJson, setLawJson] = useState("");
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

    const law = normalizeLawJsonInput(lawJson);
    if (!law.ok) {
      setError(law.error);
      setSubmitting(false);
      return;
    }

    const tagList = tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const res = await authedFetch("/api/statues", {
      method: "POST",
      body: JSON.stringify({
        title,
        body,
        lawJson: law.json,
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
          A full CHP law folder has <code>guidance.md</code>,{" "}
          <code>law.json</code>, and <code>verify.sh</code>. Here you must paste
          both the guidance (markdown) and the law definition JSON. On disk
          these live under <code>docs/chp/laws/&lt;name&gt;/</code> — not in{" "}
          <code>.chprc</code>.
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
            <span>guidance.md (markdown)</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              rows={12}
              placeholder={"Law: my-law\nSeverity: error\n\n- rule one\n- rule two"}
            />
          </label>
          <label className="new-field">
            <span>law.json</span>
            <textarea
              value={lawJson}
              onChange={(e) => setLawJson(e.target.value)}
              required
              rows={14}
              placeholder={LAW_JSON_PLACEHOLDER}
              spellCheck={false}
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
