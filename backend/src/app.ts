import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import cors from "cors";
import passport from "./config/passport.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { repoRouter } from "./modules/repos/repo.routes.js";
import { webhookRouter } from "./modules/webhooks/webhook.routes.js";
import { buildRouter } from "./modules/builds/build.routes.js";
import { deploymentRouter } from "./modules/deployments/deployment.routes.js";

export const app = express();
app.set("trust proxy", 1);

app.use(helmet());
app.use(cors());
app.use(
  express.json({
    verify: (req, _res, buf) => {
      (req as Request).rawBody = Buffer.from(buf);
    },
  }),
);
app.use(passport.initialize());
app.use(apiLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/auth", authRouter);
app.use("/repos", repoRouter);
app.use("/webhooks", webhookRouter);
app.use("/builds", buildRouter);
app.use("/deployments", deploymentRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = (err as { status?: number; statusCode?: number }).status ??
    (err as { statusCode?: number }).statusCode ??
    500;
  const message = err instanceof Error ? err.message : "Internal server error";
  res.status(status).json({ error: message });
});
