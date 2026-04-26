import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, authedFetch } from "../auth/useAuth";
import { invalidateCatalog } from "./statuesCatalog";
import type { Statue } from "./types";

type Mode = "single" | "pack";

export function NewStatuePage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("single");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [body, setBody] = useState("");
  const [lawJson, setLawJson] = useState("");
  const [packJson, setPackJson] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (authLoading) {
    return (
      <main className="wrap detail-empty">
        <p>loading…</p>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="wrap detail-empty">
        <h1>sign in to publish</h1>
        <p className="market-sub">
          Publishing a statue is auth-gated so the catalog can attribute work
          to you.
        </p>
        <Link to="/auth" className="btn">Sign in →</Link>
      </main>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErr(null);
    setSubmitting(true);

    try {
      let payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim(),
        tags: tagsRaw.split(",").map((s) => s.trim()).filter(Boolean),
      };

      if (mode === "single") {
        if (!body.trim()) throw new Error("guidance body is required");
        if (!lawJson.trim()) throw new Error("law.json is required");
        try { JSON.parse(lawJson); } catch { throw new Error("law.json is not valid JSON"); }
        payload.body = body;
        payload.lawJson = lawJson;
      } else {
        let parsed: { files?: unknown; laws?: unknown; readme?: unknown };
        try {
          parsed = JSON.parse(packJson);
        } catch {
          throw new Error("pack JSON is not valid JSON");
        }
        if (!Array.isArray(parsed.files) || parsed.files.length === 0) {
          throw new Error("pack JSON must include a non-empty files array");
        }
        payload.files = parsed.files;
        if (Array.isArray(parsed.laws)) payload.laws = parsed.laws;
        if (typeof parsed.readme === "string") payload.readme = parsed.readme;
      }

      const res = await authedFetch("/api/statues", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({} as { error?: string }));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const created = (await res.json()) as Statue;
      invalidateCatalog();
      navigate(`/marketplace/${created.slug}`);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "publish failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="new-statue">
      <div className="wrap">
        <Link to="/marketplace" className="detail-back">← marketplace</Link>
        <h1 className="detail-title">Contribute a statue</h1>
        <p className="market-sub" style={{ maxWidth: 720 }}>
          Pick the shape that matches what you want to publish. Single law for
          one rule, law pack when several rules ship together.
        </p>

        <div className="new-statue-mode">
          <button
            type="button"
            className={"btn" + (mode === "single" ? "" : " btn-ghost")}
            onClick={() => setMode("single")}
          >
            Single law
          </button>
          <button
            type="button"
            className={"btn" + (mode === "pack" ? "" : " btn-ghost")}
            onClick={() => setMode("pack")}
          >
            Law pack
          </button>
        </div>

        <form className="new-statue-form" onSubmit={submit}>
          <div className="new-field">
            <span>Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Block eval()"
              required
            />
          </div>

          <div className="new-field">
            <span>Description</span>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short blurb shown on the marketplace card"
            />
          </div>

          <div className="new-field">
            <span>Tags <em>(comma-separated, up to 12)</em></span>
            <input
              type="text"
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
              placeholder="security, javascript"
            />
          </div>

          {mode === "single" ? (
            <>
              <div className="new-field">
                <span>guidance.md</span>
                <textarea
                  rows={8}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder={"# law-name\n\n## Why\n…\n\n## Comply\n…"}
                  required
                />
              </div>
              <div className="new-field">
                <span>law.json</span>
                <textarea
                  rows={10}
                  value={lawJson}
                  onChange={(e) => setLawJson(e.target.value)}
                  placeholder={'{\n  "name": "no-eval",\n  "severity": "error",\n  "hooks": ["pre-commit"],\n  "enabled": true,\n  "checks": []\n}'}
                  spellCheck={false}
                  required
                />
              </div>
            </>
          ) : (
            <div className="new-field">
              <span>Pack JSON <em>(files[], optional laws[] and readme)</em></span>
              <textarea
                rows={20}
                value={packJson}
                onChange={(e) => setPackJson(e.target.value)}
                placeholder={'{\n  "readme": "# my pack",\n  "files": [\n    { "path": "no-eval/law.json", "content": "{...}", "size": 312 },\n    { "path": "no-eval/guidance.md", "content": "# no-eval", "size": 540 },\n    { "path": "no-eval/verify.sh", "content": "#!/usr/bin/env bash", "size": 220 }\n  ],\n  "laws": [\n    { "name": "no-eval", "hooks": ["pre-commit"], "severity": "error" }\n  ]\n}'}
                spellCheck={false}
                required
              />
            </div>
          )}

          {err && <div className="market-error">{err}</div>}

          <div className="new-actions">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? "Publishing…" : "Publish"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
