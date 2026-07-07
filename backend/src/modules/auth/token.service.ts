import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { pool } from "../../config/db.js";
import type { RowDataPacket, ResultSetHeader } from "mysql2";

export interface AccessTokenPayload {
  sub: number;
}

export function signAccessToken(userId: number): string {
  return jwt.sign({ sub: userId } satisfies AccessTokenPayload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const decoded = jwt.verify(token, env.jwt.accessSecret);
  if (typeof decoded !== "object" || typeof decoded.sub !== "number") {
    throw new Error("Malformed access token payload");
  }
  return { sub: decoded.sub };
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

export async function issueRefreshToken(userId: number): Promise<string> {
  const raw = crypto.randomBytes(40).toString("hex");
  const tokenHash = hashToken(raw);
  const expiresAt = new Date(Date.now() + env.jwt.refreshTtlDays * 24 * 60 * 60 * 1000);

  await pool.query<ResultSetHeader>(
    "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
    [userId, tokenHash, expiresAt],
  );

  return raw;
}

interface RefreshTokenRow extends RowDataPacket {
  id: number;
  user_id: number;
  expires_at: Date;
  revoked_at: Date | null;
}

export class InvalidRefreshTokenError extends Error {}

/** Rotates a refresh token: the presented token is revoked and a new one is issued. */
export async function rotateRefreshToken(rawToken: string): Promise<{ userId: number; refreshToken: string }> {
  const tokenHash = hashToken(rawToken);
  const [rows] = await pool.query<RefreshTokenRow[]>(
    "SELECT * FROM refresh_tokens WHERE token_hash = ?",
    [tokenHash],
  );
  const row = rows[0];
  if (!row || row.revoked_at || row.expires_at.getTime() < Date.now()) {
    throw new InvalidRefreshTokenError("Refresh token is invalid, expired, or already used");
  }

  await pool.query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ?", [row.id]);
  const newRefreshToken = await issueRefreshToken(row.user_id);
  return { userId: row.user_id, refreshToken: newRefreshToken };
}

export async function revokeRefreshToken(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  await pool.query("UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL", [
    tokenHash,
  ]);
}
