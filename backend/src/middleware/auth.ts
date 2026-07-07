import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { verifyAccessToken } from "../modules/auth/token.service.js";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const token = header.slice("Bearer ".length);
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: "Access token expired" });
      return;
    }
    res.status(401).json({ error: "Invalid access token" });
  }
}
