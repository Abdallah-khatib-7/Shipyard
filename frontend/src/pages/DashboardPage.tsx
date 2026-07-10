import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Lock, Globe, X } from "lucide-react";
import { api, type GithubRepoSummary, type Repo } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

function RepoCard({ repo, onDisconnect }: { repo: Repo; onDisconnect: (id: number) => void }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <Link to={`/repos/${repo.id}`} className="min-w-0 flex-1">
          <p className="truncate font-mono text-sm text-manifest hover:text-signal">{repo.full_name}</p>
          <p className="mt-1 font-mono text-xs text-manifest-dim">branch: {repo.default_branch}</p>
        </Link>
        {repo.is_private ? (
          <Lock className="h-3.5 w-3.5 shrink-0 text-manifest-faint" />
        ) : (
          <Globe className="h-3.5 w-3.5 shrink-0 text-manifest-faint" />
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <Link to={`/repos/${repo.id}`} className="text-xs text-beacon underline-offset-4 hover:underline">
          View builds
        </Link>
        <button
          onClick={() => onDisconnect(repo.id)}
          className="text-xs text-manifest-faint hover:text-hazard"
        >
          Disconnect
        </button>
      </div>
    </Card>
  );
}

export function DashboardPage() {
  const [connected, setConnected] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [available, setAvailable] = useState<GithubRepoSummary[] | null>(null);
  const [availableLoading, setAvailableLoading] = useState(false);
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [hideConnected, setHideConnected] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function loadConnected() {
    setLoading(true);
    api.repos
      .listConnected()
      .then(({ repos }) => setConnected(repos))
      .catch(() => setErrorMessage("Couldn't load your connected repos."))
      .finally(() => setLoading(false));
  }

  useEffect(loadConnected, []);

  function openPanel() {
    setPanelOpen(true);
    if (available === null) {
      setAvailableLoading(true);
      api.repos
        .listAvailable()
        .then(({ repos }) => setAvailable(repos))
        .catch(() => setErrorMessage("Couldn't load your GitHub repos."))
        .finally(() => setAvailableLoading(false));
    }
  }

  async function handleConnect(fullName: string, githubRepoId: number) {
    setConnectingId(githubRepoId);
    setErrorMessage(null);
    try {
      await api.repos.connect(fullName);
      setAvailable((prev) => prev?.map((r) => (r.githubRepoId === githubRepoId ? { ...r, connected: true } : r)) ?? null);
      loadConnected();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Couldn't connect that repo.");
    } finally {
      setConnectingId(null);
    }
  }

  async function handleDisconnect(id: number) {
    setConnected((prev) => prev.filter((r) => r.id !== id));
    try {
      await api.repos.disconnect(id);
      setAvailable((prev) => prev ?? null);
    } catch {
      loadConnected();
    }
  }

  const filteredAvailable = useMemo(() => {
    if (!available) return [];
    return available
      .filter((r) => (hideConnected ? !r.connected : true))
      .filter((r) => r.fullName.toLowerCase().includes(search.toLowerCase()));
  }, [available, hideConnected, search]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-semibold tracking-wide text-manifest">Repos</h1>
        <Button onClick={openPanel} size="sm">
          <Plus className="h-4 w-4" /> Connect repo
        </Button>
      </div>

      {errorMessage && (
        <p className="mt-4 font-mono text-xs text-hazard">{errorMessage}</p>
      )}

      {panelOpen && (
        <Card className="mt-6 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-xs uppercase tracking-[0.08em] text-manifest-faint">your github repos</p>
            <button onClick={() => setPanelOpen(false)} className="text-manifest-faint hover:text-manifest">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              placeholder="Filter by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-xs"
            />
            <div className="flex items-center gap-2">
              <Checkbox id="hide-connected" checked={hideConnected} onCheckedChange={(v) => setHideConnected(v === true)} />
              <Label htmlFor="hide-connected" className="normal-case tracking-normal text-manifest-dim">
                Hide already connected
              </Label>
            </div>
          </div>

          <div className="mt-4 max-h-80 overflow-y-auto">
            {availableLoading ? (
              <p className="py-6 text-center text-sm text-manifest-dim">Loading your repos…</p>
            ) : filteredAvailable.length === 0 ? (
              <p className="py-6 text-center text-sm text-manifest-dim">No matching repos.</p>
            ) : (
              <ul className="divide-y divide-line">
                {filteredAvailable.map((repo) => (
                  <li key={repo.githubRepoId} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0 flex items-center gap-2">
                      {repo.isPrivate ? (
                        <Lock className="h-3.5 w-3.5 shrink-0 text-manifest-faint" />
                      ) : (
                        <Globe className="h-3.5 w-3.5 shrink-0 text-manifest-faint" />
                      )}
                      <span className="truncate font-mono text-sm text-manifest">{repo.fullName}</span>
                    </div>
                    <Button
                      size="sm"
                      variant={repo.connected ? "secondary" : "primary"}
                      disabled={repo.connected || connectingId === repo.githubRepoId}
                      onClick={() => handleConnect(repo.fullName, repo.githubRepoId)}
                    >
                      {repo.connected ? "Connected" : connectingId === repo.githubRepoId ? "Connecting…" : "Connect"}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      <div className="mt-8">
        {loading ? (
          <p className="text-sm text-manifest-dim">Loading repos…</p>
        ) : connected.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-manifest-dim">
              No repos connected yet. Connect one to trigger your first build.
            </p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connected.map((repo) => (
              <RepoCard key={repo.id} repo={repo} onDisconnect={handleDisconnect} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
