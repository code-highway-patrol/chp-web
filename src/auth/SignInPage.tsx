import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";
import { useAuth } from "./useAuth";
import { GithubMark } from "../GithubMark";

export function SignInPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) navigate("/marketplace", { replace: true });
  }, [loading, user, navigate]);

  const signIn = async (provider: "google" | "github") => {
    setBusy(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setBusy(null);
      setError(error.message);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-eyebrow">access the marketplace</div>
        <h1 className="auth-title">
          Sign in to publish<br />and star statues.
        </h1>
        <p className="auth-sub">
          Statues are community rule packs. You need an account to publish
          your own or star the ones you depend on.
        </p>
        <div className="auth-providers">
          <button
            className="auth-btn"
            onClick={() => signIn("google")}
            disabled={busy !== null}
          >
            <GoogleMark />
            {busy === "google" ? "Redirecting…" : "Continue with Google"}
          </button>
          <button
            className="auth-btn"
            onClick={() => signIn("github")}
            disabled={busy !== null}
          >
            <GithubMark size={18} />
            {busy === "github" ? "Redirecting…" : "Continue with GitHub"}
          </button>
        </div>
        {error && <div className="auth-error">{error}</div>}
        <div className="auth-foot">
          By continuing you agree to be patrolled.
        </div>
      </div>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#EA4335"
        d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z"
      />
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.74-.06-1.28-.19-1.84H9v3.34h4.96c-.1.83-.64 2.08-1.84 2.92l2.84 2.2c1.7-1.57 2.68-3.88 2.68-6.62z"
      />
      <path
        fill="#FBBC05"
        d="M3.88 10.78A5.54 5.54 0 0 1 3.58 9c0-.62.11-1.22.29-1.78L.96 4.96A9.008 9.008 0 0 0 0 9c0 1.45.35 2.82.96 4.04l2.92-2.26z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.84-2.2c-.76.53-1.78.9-3.12.9-2.38 0-4.4-1.57-5.12-3.74L.97 13.04C2.45 15.98 5.48 18 9 18z"
      />
    </svg>
  );
}
