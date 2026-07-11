import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy } from "lucide-react";
import { api, type Deployment } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn, formatRelativeTime } from "@/lib/utils";

interface DeploymentWithRepo extends Deployment {
  repoId: number;
  repoFullName: string;
}

export function DeploymentsPage() {
  const [deployments, setDeployments] = useState<DeploymentWithRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveOnly, setLiveOnly] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const grouped = useMemo(() => {
    const map = new Map<string, DeploymentWithRepo[]>();
    for (const dep of visible) {
      const list = map.get(dep.repoFullName) ?? [];
      list.push(dep);
      map.set(dep.repoFullName, list);
    }
    return Array.from(map.entries());
  }, [visible]);

  async function handleCopy(id: string, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1500);
  }

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
          <div className="space-y-6">
            {grouped.map(([repoFullName, deps]) => (
              <div key={repoFullName}>
                <Link
                  to={`/repos/${deps[0].repoId}`}
                  className="font-mono text-xs uppercase tracking-[0.08em] text-manifest-faint hover:text-manifest"
                >
                  {repoFullName}
                </Link>
                <div className="mt-2 divide-y divide-line rounded-[3px] border border-line bg-deckplate">
                  {deps.map((dep) => (
                    <div
                      key={dep.id}
                      className={cn("flex items-center justify-between gap-3 px-4 py-3", !dep.isCurrent && "opacity-60")}
                    >
                      <div className="min-w-0 flex items-center gap-2.5">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 shrink-0 rounded-full",
                            dep.isCurrent ? "bg-beacon animate-pulse-slow" : "bg-manifest-faint",
                          )}
                        />
                        <a
                          href={dep.url}
                          target="_blank"
                          rel="noreferrer"
                          className="truncate font-mono text-sm text-manifest hover:text-beacon"
                        >
                          {dep.url.replace(/^https?:\/\//, "")}
                        </a>
                        {dep.isCurrent && (
                          <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.06em] text-beacon">
                            current
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="font-mono text-xs text-manifest-faint">{formatRelativeTime(dep.createdAt)}</span>
                        <button
                          onClick={() => handleCopy(dep.id, dep.url)}
                          aria-label="Copy deployment URL"
                          className="text-manifest-faint hover:text-manifest"
                        >
                          {copiedId === dep.id ? (
                            <Check className="h-3.5 w-3.5 text-beacon" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}