import type { Profile } from "passport-github2";
import { pool } from "../../config/db.js";
import type { UserRow } from "../../types/models.js";

export interface PublicUser {
  id: number;
  githubUsername: string;
  avatarUrl: string | null;
}

function toPublicUser(row: UserRow): PublicUser {
  return {
    id: row.id,
    githubUsername: row.github_username,
    avatarUrl: row.avatar_url,
  };
}

export async function upsertGithubUser(profile: Profile, accessToken: string): Promise<PublicUser> {
  const githubId = profile.id;
  const username = profile.username ?? profile.displayName ?? `github-${githubId}`;
  const avatarUrl = profile.photos?.[0]?.value ?? null;

  await pool.query(
    `INSERT INTO users (github_id, github_username, avatar_url, github_access_token)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       github_username = VALUES(github_username),
       avatar_url = VALUES(avatar_url),
       github_access_token = VALUES(github_access_token)`,
    [githubId, username, avatarUrl, accessToken],
  );

  const [rows] = await pool.query<UserRow[]>("SELECT * FROM users WHERE github_id = ?", [githubId]);
  const row = rows[0];
  if (!row) {
    throw new Error("Failed to upsert GitHub user");
  }
  return toPublicUser(row);
}

export async function getUserById(id: number): Promise<PublicUser | null> {
  const [rows] = await pool.query<UserRow[]>("SELECT * FROM users WHERE id = ?", [id]);
  const row = rows[0];
  return row ? toPublicUser(row) : null;
}

export async function getUserGithubToken(id: number): Promise<string | null> {
  const [rows] = await pool.query<UserRow[]>("SELECT * FROM users WHERE id = ?", [id]);
  return rows[0]?.github_access_token ?? null;
}
