import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/MagneticButton";
import { GithubMark } from "@/components/icons";

export function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-hull px-6">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 inline-flex items-center gap-1.5 text-sm text-manifest-dim hover:text-manifest">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 bg-signal" />
          <span className="font-display text-lg font-semibold tracking-wide text-manifest">SHIPYARD</span>
        </div>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-wide text-manifest">Sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-manifest-dim">
          Shipyard reads your repos and manages push webhooks on the ones you connect, so sign-in goes
          through GitHub directly — there's no separate password to set.
        </p>
        <MagneticButton className="mt-8 block w-full">
          <Button asChild size="lg" className="w-full">
            <a href={api.auth.githubLoginUrl()}>
              <GithubMark className="h-4 w-4" /> Continue with GitHub
            </a>
          </Button>
        </MagneticButton>
      </div>
    </div>
  );
}
