import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { MagneticButton } from "@/components/MagneticButton";
import { GithubMark } from "@/components/icons";

const SCOPES = [
  { scope: "repo", reason: "read your repos and their commits" },
  { scope: "admin:repo_hook", reason: "create the push webhook on repos you connect" },
  { scope: "user:email", reason: "identify your account" },
];

const AFTER_SIGN_IN = [
  "Pick which repos Shipyard can build",
  "Push to your default branch",
  "Watch the build stream in real time",
  "Get a live subdomain the moment it finishes",
];

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center bg-signal font-mono text-xs font-bold text-hull-deep">
        SY
      </span>
      <span className="font-display text-xl font-extrabold uppercase tracking-wide text-manifest">Shipyard</span>
    </div>
  );
}

export function LoginPage() {
  return (
    <div className="grid min-h-screen bg-hull lg:grid-cols-2">
      <div className="flex flex-col justify-center px-6 py-16 md:px-16 lg:px-20">
        <div className="w-full max-w-sm">
          <Link to="/" className="mb-10 inline-flex items-center gap-1.5 text-sm text-manifest-dim hover:text-manifest">
            <ArrowLeft className="h-3.5 w-3.5" /> Back
          </Link>

          <Wordmark />

          <h1 className="mt-8 font-display text-4xl font-extrabold uppercase tracking-wide text-manifest">
            Sign in
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-manifest-dim">
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

          <div className="mt-10 border-t border-line-soft pt-6">
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-manifest-faint">what github grants us</p>
            <ul className="mt-3 space-y-2.5">
              {SCOPES.map((s) => (
                <li key={s.scope} className="flex items-baseline gap-2.5 font-mono text-[13px]">
                  <span className="shrink-0 text-route">{s.scope}</span>
                  <span className="text-manifest-dim">{s.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="hidden border-l border-line bg-hull-deep lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="max-w-sm">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-beacon">after you sign in</p>
          <ol className="mt-5 space-y-5">
            {AFTER_SIGN_IN.map((step, i) => (
              <li key={step} className="flex items-start gap-4">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center border border-line font-mono text-xs text-manifest-faint">
                  {i + 1}
                </span>
                <span className="text-[15px] leading-relaxed text-manifest-dim">{step}</span>
              </li>
            ))}
          </ol>

          <div className="mt-10 border border-line bg-deckplate">
            <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
              <span className="flex gap-1.5">
                <span className="h-2 w-2 rounded-full bg-line" />
                <span className="h-2 w-2 rounded-full bg-line" />
                <span className="h-2 w-2 rounded-full bg-line" />
              </span>
              <span className="flex-1 truncate border border-line bg-hull px-3 py-1 font-mono text-xs text-manifest-faint">
                https://<span className="text-manifest">your-repo</span>.shpit.uk
              </span>
            </div>
            <div className="flex items-center gap-2.5 px-5 py-8">
              <span className="h-2 w-2 rounded-full bg-manifest-faint" />
              <span className="font-mono text-sm text-manifest-faint">awaiting first push…</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}