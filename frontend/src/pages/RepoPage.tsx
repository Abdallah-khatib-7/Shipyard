import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Play, Lock, Globe } from "lucide-react";
import { api, type Repo, type BuildRow, type Deployment } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BuildStatusBadge } from "@/components/BuildStatusBadge";
import { formatRelativeTime, shortSha } from "@/lib/utils";

export function RepoPage() {
  const { id } = useParams<{ id: string }>();
  const repoId = Number(id);
  const navigate = useNavigate();

  const [repo, setRepo] = useState<Repo | null>(null);
  const [builds, setBuilds] = useState<BuildRow[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);

    Promise.all([api.repos.listConnected(), api.builds.listForRepo(repoId), api.deployments.listForRepo(repoId)])
      .then(([repos, buildsRes, deploymentsRes]) => {
        if (cancelled) return;
        const match = repos.repos.find((r) => r.id === repoId);
        if (!match) {
          setNotFound(true);
          return;
        }
        setRepo(match);
        setBuilds(buildsRes.builds);
        setDeployments(deploymentsRes.deployments);
      })
      .catch(() => setNotFound(true))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [repoId]);

  async function handleTrigger() {
    setTriggering(true);
    setErrorMessage(null);
    try {
      const { buildId } = await api.builds.trigger(repoId);
      navigate(`/builds/${buildId}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't start a build.");
      setTriggering(false);
    }
  }

  async function handleDisconnect() {
    if (!repo) return;
    await api.repos.disconnect(repo.id).catch(() => {});
    navigate("/dashboard", { replace: true });
  }

  if (loading) {
    return <p className="text-sm text-manifest-dim">Loading repo…</p>;
  }

  if (notFound || !repo) {
    return (
      <div>
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-manifest-dim hover:text-manifest">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to repos
        </Link>
        <p className="mt-6 text-sm text-manifest-dim">
          This repo isn't connected to your account, or it's already been disconnected.
        </p>
      </div>
    );
  }

  const currentDeployment = deployments.find((d) => d.isCurrent);

  return (
    <div>
      <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-manifest-dim hover:text-manifest">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to repos
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {repo.is_private ? (
              <Lock className="h-4 w-4 text-manifest-faint" />
            ) : (
              <Globe className="h-4 w-4 text-manifest-faint" />
            )}
            <h1 className="font-mono text-2xl text-manifest">{repo.full_name}</h1>
          </div>
          <p className="mt-1 font-mono text-xs text-manifest-dim">default branch: {repo.default_branch}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={handleTrigger} disabled={triggering} size="sm">
            <Play className="h-3.5 w-3.5" /> {triggering ? "Starting…" : "Trigger build"}
          </Button>
          <Button onClick={handleDisconnect} variant="destructive" size="sm">
            Disconnect
          </Button>
        </div>
      </div>

      {errorMessage && <p className="mt-3 font-mono text-xs text-hazard">{errorMessage}</p>}

      {currentDeployment && (
        <Card className="mt-6 p-4">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-manifest-faint">live deployment</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-beacon animate-pulse-slow" />
            <a
              href={currentDeployment.url}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm text-beacon underline-offset-4 hover:underline"
            >
              {currentDeployment.url}
            </a>
          </div>
        </Card>
      )}

      <div className="mt-8">
        <h2 className="font-display text-xl font-semibold tracking-wide text-manifest">Build history</h2>
        {builds.length === 0 ? (
          <Card className="mt-3 p-8 text-center">
            <p className="text-sm text-manifest-dim">No builds yet. Trigger one, or push to {repo.default_branch}.</p>
          </Card>
        ) : (
          <div className="mt-3 divide-y divide-line rounded-[3px] border border-line bg-deckplate">
            {builds.map((build) => (
              <Link
                key={build.id}
                to={`/builds/${build.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-deckplate-raised"
              >
                <div className="min-w-0">
                  <p className="font-mono text-sm text-manifest">
                    {build.branch} <span className="text-route">@ {shortSha(build.commit_sha)}</span>
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-manifest-faint">
                    {formatRelativeTime(build.created_at)}
                  </p>
                </div>
                <BuildStatusBadge status={build.status} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
