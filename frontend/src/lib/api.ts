import { useAuthStore } from "@/store/authStore";

const API_URL = import.meta.env.VITE_API_URL as string;

export interface User {
  id: number;
  githubUsername: string;
  avatarUrl: string | null;
}

/** Raw DB row shape — repo.controller.ts returns these fields as-is, snake_case. */
export interface Repo {
  id: number;
  user_id: number;
  github_repo_id: string;
  full_name: string;
  default_branch: string;
  is_private: number;
  webhook_id: string | null;
  install_command: string | null;
  build_command: string | null;
  output_dir: string | null;
  created_at: string;
  updated_at: string;
}

export interface GithubRepoSummary {
  githubRepoId: number;
  fullName: string;
  defaultBranch: string;
  isPrivate: boolean;
  connected: boolean;
}

export type BuildStatus = "queued" | "running" | "success" | "failed" | "timeout" | "cancelled";

/** Raw DB row shape — returned as-is by GET /builds/repo/:repoId */
export interface BuildRow {
  id: string;
  repo_id: number;
  user_id: number;
  commit_sha: string;
  branch: string;
  status: BuildStatus;
  log: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

/** Mapped shape — returned by GET /builds/:id */
export interface BuildDetail {
  id: string;
  repoId: number;
  commitSha: string;
  branch: string;
  status: BuildStatus;
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface Deployment {
  id: string;
  buildId: string;
  subdomain: string;
  url: string;
  isCurrent: boolean;
  createdAt: string;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const { refreshToken, setTokens, logout } = useAuthStore.getState();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("refresh failed");
        const data = (await res.json()) as { accessToken: string; refreshToken: string };
        setTokens(data.accessToken, data.refreshToken);
        return data.accessToken;
      })
      .catch(() => {
        logout();
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, allowRetry = true): Promise<T> {
  const { accessToken } = useAuthStore.getState();
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && allowRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return request<T>(path, options, false);
    }
    throw new ApiError(401, "Session expired");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (body as { error?: string }).error ?? `Request failed (${res.status})`);
  }
  return body as T;
}

export const api = {
  auth: {
    me: () => request<{ user: User }>("/auth/me"),
    refresh: (refreshToken: string) =>
      request<{ accessToken: string; refreshToken: string }>("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),
    logout: (refreshToken: string) =>
      request<void>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      }),
    githubLoginUrl: () => `${API_URL}/auth/github`,
  },
  repos: {
    listAvailable: () => request<{ repos: GithubRepoSummary[] }>("/repos/github"),
    listConnected: () => request<{ repos: Repo[] }>("/repos"),
    connect: (fullName: string) =>
      request<{ repo: Repo }>("/repos", { method: "POST", body: JSON.stringify({ fullName }) }),
    updateSettings: (
      id: number,
      updates: { installCommand?: string | null; buildCommand?: string | null; outputDir?: string | null },
    ) => request<{ repo: Repo }>(`/repos/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
    disconnect: (id: number) => request<void>(`/repos/${id}`, { method: "DELETE" }),
  },
  builds: {
    trigger: (repoId: number, branch?: string) =>
      request<{ buildId: string }>("/builds", { method: "POST", body: JSON.stringify({ repoId, branch }) }),
    getStatus: (id: string) => request<{ build: BuildDetail }>(`/builds/${id}`),
    getLogs: (id: string) => request<{ log: string }>(`/builds/${id}/logs`),
    listForRepo: (repoId: number) => request<{ builds: BuildRow[] }>(`/builds/repo/${repoId}`),
  },
  deployments: {
    listForRepo: (repoId: number) => request<{ deployments: Deployment[] }>(`/deployments/repo/${repoId}`),
    getOne: (id: string) => request<{ deployment: Deployment }>(`/deployments/${id}`),
  },
};
