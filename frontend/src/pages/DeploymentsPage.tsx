import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, type Deployment } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatRelativeTime } from "@/lib/utils";

interface DeploymentWithRepo extends Deployment {
  repoId: number;
  repoFullName: string;
}

export function DeploymentsPage() {
  const [deployments, setDeployments] = useState<DeploymentWithRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveOnly, setLiveOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.repos
      .listConnected()
      .then(async ({ repos }) => {
        const perRepo = await Promise.all(
          repos.map((repo) =>
            api.deployments
              .listForRepo(repo.id)
              .then(({ deployments: d }) => d.map((dep) => ({ ...dep, repoId: repo.id, repoFullName: repo.full_name })))
              .catch(() => []),
          ),
        );
        if (cancelled) return;
        const merged = perRepo.flat().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setDeployments(merged);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(
    () => (liveOnly ? deployments.filter((d) => d.isCurrent) : deployments),
    [deployments, liveOnly],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold tracking-wide text-manifest">Deployments</h1>
        <div className="flex items-center gap-2">
          <Checkbox id="live-only" checked={liveOnly} onCheckedChange={(v) => setLiveOnly(v === true)} />
          <Label htmlFor="live-only" className="normal-case tracking-normal text-manifest-dim">
            Live only
          </Label>
        </div>
      </div>

      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-manifest-dim">Loading deployments…</p>
        ) : visible.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-manifest-dim">
              {liveOnly
                ? "Nothing is live right now."
                : "No deployments yet. Trigger a build from a connected repo to get your first one."}
            </p>
          </Card>
        ) : (
          <div className="divide-y divide-line rounded-[3px] border border-line bg-deckplate">
            {visible.map((d) => (
              <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <Link to={`/repos/${d.repoId}`} className="font-mono text-xs text-manifest-dim hover:text-manifest">
                    {d.repoFullName}
                  </Link>
                  <a
                    href={d.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block truncate font-mono text-sm text-beacon underline-offset-4 hover:underline"
                  >
                    {d.url}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  {d.isCurrent && <span className="h-1.5 w-1.5 rounded-full bg-beacon animate-pulse-slow" />}
                  <span className="font-mono text-xs text-manifest-faint">
                    {d.isCurrent ? "live" : "superseded"} · {formatRelativeTime(d.createdAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
