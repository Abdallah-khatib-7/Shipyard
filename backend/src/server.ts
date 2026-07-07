import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { initSocket } from "./services/socket.service.js";
import { startBuildWorker } from "./services/buildQueue.service.js";
import { scheduleCleanup } from "./services/cleanup.service.js";

const httpServer = createServer(app);
initSocket(httpServer);
const worker = startBuildWorker();
scheduleCleanup();

httpServer.listen(env.port, () => {
  console.log(`Shipyard backend listening on ${env.port}`);
});

async function shutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down`);
  await worker.close();
  httpServer.close(() => process.exit(0));
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
