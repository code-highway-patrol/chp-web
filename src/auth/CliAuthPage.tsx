import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase, isSupabaseConfigured } from "./supabase";
import { useAuth, authedFetch } from "./useAuth";
import { GithubMark } from "../GithubMark";

const PENDING_CODE_KEY = "chp_pending_cli_code";

type Phase = "idle" | "authorizing" | "done" | "error";

export function CliAuthPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const code = useMemo(() => params.get("code") ?? "", [params]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [errorOverride, setErrorOverride] = useState<string | null>(null);
  const [busy, setBusy] = useState<"google" | "github" | null>(null);
  const error = errorOverride ?? (code ? null : "Missing authorization code in URL.");
  const setError = setErrorOverride;

  const startOAuth = async (provider: "google" | "github") => {
    if (!code) return;
    setBusy(provider);
    setError(null);
    sessionStorage.setItem(PENDING_CODE_KEY, code);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      sessionStorage.removeItem(PENDING_CODE_KEY);
      setBusy(null);
      setError(error.message);
    }
  };

  const authorize = async () => {
    if (!code) return;
    setPhase("authorizing");
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        setError("Not signed in.");
        setPhase("error");
        return;
      }
      const res = await authedFetch("/api/cli-auth/complete", {
        method: "POST",
        body: JSON.stringify({
          code,
          refresh_token: session.refresh_token ?? null,
          expires_at: session.expires_at ?? null,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? `Request failed (${res.status})`);
        setPhase("error");
        return;
      }
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unexpected error");
      setPhase("error");
    }
  };

  const cancel = () => navigate("/marketplace", { replace: true });

  if (!isSupabaseConfigured) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-eyebrow">cli authorization</div>
          <h1 className="auth-title">Sign-in is not configured.</h1>
          <p className="auth-sub">
            Set <code>VITE_SUPABASE_URL</code> and{" "}
            <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env</code>.
          </p>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <p className="auth-sub">Loading…</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-eyebrow">cli authorization</div>
          <h1 className="auth-title">
            Sign in to authorize<br />the chp CLI.
          </h1>
          <p className="auth-sub">
            The CLI on your machine is asking for permission to publish laws to
            the marketplace as you. Sign in below, then confirm.
          </p>
          <div className="auth-providers">
            <button
              className="auth-btn"
              onClick={() => startOAuth("google")}
              disabled={busy !== null || !code}
            >
              {busy === "google" ? "Redirecting…" : "Continue with Google"}
            </button>
            <button
              className="auth-btn"
              onClick={() => startOAuth("github")}
              disabled={busy !== null || !code}
            >
              <GithubMark size={18} />
              {busy === "github" ? "Redirecting…" : "Continue with GitHub"}
            </button>
          </div>
          {error && <div className="auth-error">{error}</div>}
        </div>
      </main>
    );
  }

  if (phase === "done") {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-eyebrow">cli authorization</div>
          <h1 className="auth-title">You're signed in.</h1>
          <p className="auth-sub">
            Return to your terminal — the CLI has the credentials it needs.
            You can close this tab.
          </p>
          <div className="auth-foot">
            Signed in as <code>{user.email ?? user.id}</code>.
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-eyebrow">cli authorization</div>
        <h1 className="auth-title">
          Authorize the chp CLI<br />on this machine?
        </h1>
        <p className="auth-sub">
          The CLI will be able to publish laws to the marketplace as{" "}
          <code>{user.email ?? user.id}</code>. The token expires when your
          Supabase session does. You can revoke access by signing out.
        </p>
        <div className="auth-providers">
          <button
            className="auth-btn"
            onClick={authorize}
            disabled={phase === "authorizing" || !code}
          >
            {phase === "authorizing" ? "Authorizing…" : "Authorize CLI"}
          </button>
          <button className="auth-btn" onClick={cancel} disabled={phase === "authorizing"}>
            Cancel
          </button>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-foot">
          Code: <code>{code.slice(0, 8)}…</code>
        </div>
      </div>
    </main>
  );
}
