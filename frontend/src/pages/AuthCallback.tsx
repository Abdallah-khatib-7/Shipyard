import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorParam = params.get("error");
    if (errorParam) {
      setError("GitHub sign-in didn't complete. You can try again.");
      return;
    }

    const accessToken = params.get("accessToken");
    const refreshToken = params.get("refreshToken");
    if (!accessToken || !refreshToken) {
      setError("Missing sign-in tokens. You can try again.");
      return;
    }

    setTokens(accessToken, refreshToken);
    api.auth
      .me()
      .then(({ user }) => {
        setUser(user);
        navigate("/dashboard", { replace: true });
      })
      .catch(() => setError("Couldn't load your account after sign-in. You can try again."));
  }, [navigate, setTokens, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-hull px-6">
      <div className="max-w-sm text-center">
        {error ? (
          <>
            <p className="font-mono text-sm text-hazard">{error}</p>
            <Link to="/login" className="mt-4 inline-block text-sm text-beacon underline-offset-4 hover:underline">
              Back to sign in
            </Link>
          </>
        ) : (
          <p className="font-mono text-sm text-manifest-dim">connecting your account…</p>
        )}
      </div>
    </div>
  );
}
