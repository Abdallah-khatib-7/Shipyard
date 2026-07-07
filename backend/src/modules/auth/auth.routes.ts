import { Router } from "express";
import { z } from "zod";
import passport from "../../config/passport.js";
import { validate } from "../../middleware/validate.js";
import { requireAuth } from "../../middleware/auth.js";
import { githubCallback, refresh, logout, me } from "./auth.controller.js";

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authRouter = Router();

authRouter.get("/github", passport.authenticate("github", { session: false }));

authRouter.get(
  "/github/callback",
  passport.authenticate("github", { session: false, failWithError: true }),
  githubCallback,
);

authRouter.post("/refresh", validate(refreshTokenSchema), refresh);
authRouter.post("/logout", validate(refreshTokenSchema), logout);
authRouter.get("/me", requireAuth, me);
