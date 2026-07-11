import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, type BuildDetail, type BuildStatus, type Deployment } from "@/lib/api";
import { LogStream } from "@/components/LogStream";
import { BuildStatusBadge } from "@/components/BuildStatusBadge";
import { Card } from "@/components/ui/card";
import { shortSha } from "@/lib/utils";

export function BuildPage() {
  const { id } = useParams<{ id: string }>();
  const buildId = id!;

  const [build, setBuild] = useState<BuildDetail | null>(null);
  const [status, setStatus] = useState<BuildStatus | null>(null);
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
        </div>
        <BuildStatusBadge status={status} />
      </div>

      {build.errorMessage && (
        <p className="mt-3 rounded-[3px] border border-hazard/40 bg-hazard/10 px-3 py-2 font-mono text-xs text-hazard">
          {build.errorMessage}
        </p>
      )}

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
