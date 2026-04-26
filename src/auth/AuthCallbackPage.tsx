import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "./supabase";

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      const pendingCode = sessionStorage.getItem("chp_pending_cli_code");
      if (data.session && pendingCode) {
        sessionStorage.removeItem("chp_pending_cli_code");
        navigate(`/cli-auth?code=${encodeURIComponent(pendingCode)}`, {
          replace: true,
        });
        return;
      }
      navigate(data.session ? "/marketplace" : "/auth", { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <main className="wrap" style={{ paddingTop: 96, paddingBottom: 96 }}>
      <p>Signing you in...</p>
    </main>
  );
}
