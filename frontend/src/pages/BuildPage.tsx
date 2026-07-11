import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { api, type BuildDetail, type BuildStatus, type Deployment, type Repo } from "@/lib/api";
import { LogStream } from "@/components/LogStream";
import { BuildStatusBadge } from "@/components/BuildStatusBadge";
import { Card } from "@/components/ui/card";
import { formatRelativeTime, shortSha } from "@/lib/utils";

function formatDuration(startedAt: string | null, finishedAt: string | null): string | null {
  if (!startedAt || !finishedAt) return null;
  const seconds = Math.round((new Date(finishedAt).getTime() - new Date(startedAt).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function BuildPage() {
  const { id } = useParams<{ id: string }>();
  const buildId = id!;

  const [build, setBuild] = useState<BuildDetail | null>(null);
  const [status, setStatus] = useState<BuildStatus | null>(null);
  const [repo, setRepo] = useState<Repo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deployment, setDeployment] = useState<Deployment | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.builds
      .getStatus(buildId)
      .then(({ build: b }) => {
        if (cancelled) return;
        setBuild(b);
        setStatus(b.status);
        return api.repos.listConnected().then(({ repos }) => {
          if (cancelled) return;
          setRepo(repos.find((r) => r.id === b.repoId) ?? null);
        });
      })
      .catch(() => setNotFound(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [buildId]);

  useEffect(() => {
    if (!build || status !== "success") return;
    let cancelled = false;
    api.deployments
      .listForRepo(build.repoId)
      .then(({ deployments }) => {
        if (cancelled) return;
        const match = deployments.find((d) => d.buildId === buildId);
        if (match) setDeployment(match);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [build, status, buildId]);

  if (loading) {
    return <p className="text-sm text-manifest-dim">Loading build…</p>;
  }

  if (notFound || !build || !status) {
    return (
      <div>
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-manifest-dim hover:text-manifest">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to repos
        </Link>
        <p className="mt-6 text-sm text-manifest-dim">This build doesn't exist, or it isn't yours to view.</p>
      </div>
    );
  }

  const duration = formatDuration(build.startedAt, build.finishedAt);

  return (
    <div>
      <Link
        to={`/repos/${build.repoId}`}
        className="inline-flex items-center gap-1.5 text-sm text-manifest-dim hover:text-manifest"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to repo
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-mono text-2xl text-manifest">
            {build.branch} <span className="text-route">@ {shortSha(build.commitSha)}</span>
          </h1>
          {repo && <p className="mt-1 font-mono text-xs text-manifest-dim">{repo.full_name}</p>}
        </div>
        <BuildStatusBadge status={status} />
      </div>

      {build.errorMessage && (
        <p className="mt-3 rounded-[3px] border border-hazard/40 bg-hazard/10 px-3 py-2 font-mono text-xs text-hazard">
          {build.errorMessage}
        </p>
      )}

      <Card className="mt-4 grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.06em] text-manifest-faint">commit</p>
          {repo ? (
            <a
              href={`https://github.com/${repo.full_name}/commit/${build.commitSha}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 font-mono text-sm text-route hover:underline"
            >
              {shortSha(build.commitSha)} <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <p className="mt-1 font-mono text-sm text-manifest">{shortSha(build.commitSha)}</p>
          )}
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.06em] text-manifest-faint">started</p>
          <p className="mt-1 font-mono text-sm text-manifest">{formatRelativeTime(build.startedAt)}</p>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.06em] text-manifest-faint">finished</p>
          <p className="mt-1 font-mono text-sm text-manifest">{formatRelativeTime(build.finishedAt)}</p>
        </div>
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.06em] text-manifest-faint">duration</p>
          <p className="mt-1 font-mono text-sm text-manifest">{duration ?? "—"}</p>
        </div>
      </Card>

      {deployment && (
        <Card className="mt-4 p-4">
          <p className="font-mono text-xs uppercase tracking-[0.08em] text-manifest-faint">deployed</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-beacon animate-pulse-slow" />
            <a
              href={deployment.url}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-sm text-beacon underline-offset-4 hover:underline"
            >
              {deployment.url}
            </a>
          </div>
        </Card>
      )}

      <LogStream buildId={buildId} status={status} onStatusChange={setStatus} className="mt-6" />
    </div>
  );
}