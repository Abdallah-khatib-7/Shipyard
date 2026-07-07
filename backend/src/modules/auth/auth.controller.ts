import type { Request, Response } from "express";
import { getUserById, type PublicUser } from "./auth.service.js";
import { signAccessToken, issueRefreshToken, rotateRefreshToken, revokeRefreshToken, InvalidRefreshTokenError } from "./token.service.js";

export async function githubCallback(req: Request, res: Response): Promise<void> {
  const user = req.user as PublicUser | undefined;
  if (!user) {
    res.status(401).json({ error: "GitHub authentication failed" });
    return;
  }

  const accessToken = signAccessToken(user.id);
  const refreshToken = await issueRefreshToken(user.id);

  res.json({ accessToken, refreshToken, user });
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string };
  try {
    const rotated = await rotateRefreshToken(refreshToken);
    const accessToken = signAccessToken(rotated.userId);
    res.json({ accessToken, refreshToken: rotated.refreshToken });
  } catch (err) {
    if (err instanceof InvalidRefreshTokenError) {
      res.status(401).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string };
  await revokeRefreshToken(refreshToken);
  res.status(204).send();
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await getUserById(req.userId!);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ user });
}
