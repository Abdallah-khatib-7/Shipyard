import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import { verifyAccessToken } from "../modules/auth/token.service.js";
import { pool } from "../config/db.js";
import type { BuildRow } from "../types/models.js";

let io: SocketIOServer | undefined;

function buildRoom(buildId: string): string {
  return `build:${buildId}`;
}

async function buildBelongsToUser(buildId: string, userId: number): Promise<boolean> {
  const [rows] = await pool.query<BuildRow[]>("SELECT id FROM builds WHERE id = ? AND user_id = ?", [
    buildId,
    userId,
  ]);
  return rows.length > 0;
}

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      next(new Error("Missing auth token"));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Invalid auth token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    socket.on("subscribe:build", async (buildId: string, ack?: (ok: boolean) => void) => {
      const userId = socket.data.userId as number;
      const allowed = await buildBelongsToUser(buildId, userId).catch(() => false);
      if (!allowed) {
        ack?.(false);
        return;
      }
      await socket.join(buildRoom(buildId));
      ack?.(true);
    });

    socket.on("unsubscribe:build", (buildId: string) => {
      socket.leave(buildRoom(buildId));
    });
  });

  return io;
}

export function emitBuildLog(buildId: string, chunk: string): void {
  io?.to(buildRoom(buildId)).emit("build:log", { buildId, chunk });
}

export function emitBuildStatus(buildId: string, status: string): void {
  io?.to(buildRoom(buildId)).emit("build:status", { buildId, status });
}
