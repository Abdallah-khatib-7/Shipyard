import { ExternalLink, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LIMITS = [
  { label: "Concurrent builds", value: "2 per account" },
  { label: "Build runs", value: "10 per hour" },
  { label: "Max build duration", value: "5 minutes" },
  { label: "Build log retention", value: "14 days" },
];

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  async function handleSignOut() {
    if (refreshToken) {
      await api.auth.logout(refreshToken).catch(() => {});
    }
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-semibold tracking-wide text-manifest">Settings</h1>

      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center gap-3">
            {user?.avatarUrl && (
              <img src={user.avatarUrl} alt="" className="h-12 w-12 rounded-[3px]" referrerPolicy="no-referrer" />
            )}
            <div>
              <CardTitle className="text-lg">{user?.githubUsername}</CardTitle>
              <CardDescription>Signed in with GitHub</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <a
            href={`https://github.com/${user?.githubUsername}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-beacon underline-offset-4 hover:underline"
          >
            View GitHub profile <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <p className="mt-3 text-sm leading-relaxed text-manifest-dim">
            Your profile and access come straight from GitHub — there's nothing to edit here beyond signing
            out. Repo access is managed per-repo from the dashboard.
          </p>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSignOut} variant="secondary" size="sm">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </Button>
        </CardFooter>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg">Account limits</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 font-mono text-sm">
            {LIMITS.map((limit) => (
              <div key={limit.label}>
                <dt className="text-xs uppercase tracking-[0.08em] text-manifest-faint">{limit.label}</dt>
                <dd className="mt-1 text-manifest">{limit.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
