import type { RowDataPacket } from "mysql2";

export interface UserRow extends RowDataPacket {
  id: number;
  github_id: string;
  github_username: string;
  avatar_url: string | null;
  github_access_token: string;
  created_at: Date;
  updated_at: Date;
}

export interface RepoRow extends RowDataPacket {
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
  created_at: Date;
  updated_at: Date;
}

export type BuildStatus = "queued" | "running" | "success" | "failed" | "timeout" | "cancelled";

export interface BuildRow extends RowDataPacket {
  id: string;
  repo_id: number;
  user_id: number;
  commit_sha: string;
  branch: string;
  status: BuildStatus;
  log: string | null;
  error_message: string | null;
  started_at: Date | null;
  finished_at: Date | null;
  created_at: Date;
}

export interface DeploymentRow extends RowDataPacket {
  id: string;
  build_id: string;
  repo_id: number;
  subdomain: string;
  s3_prefix: string;
  cloudflare_record_id: string | null;
  is_current: number;
  created_at: Date;
}
