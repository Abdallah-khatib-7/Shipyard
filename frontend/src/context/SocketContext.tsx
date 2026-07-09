import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "@/store/authStore";

const API_URL = import.meta.env.VITE_API_URL as string;

interface BuildLogPayload {
  buildId: string;
  chunk: string;
}

interface BuildStatusPayload {
  buildId: string;
  status: string;
}

interface BuildSubscriptionHandlers {
  onLog?: (chunk: string) => void;
  onStatus?: (status: string) => void;
}

interface SocketContextValue {
  connected: boolean;
  subscribeToBuild: (buildId: string, handlers: BuildSubscriptionHandlers) => () => void;
}

const SocketContext = createContext<SocketContextValue | null>(null);

export function SocketProvider({ children }: { children: ReactNode }): React.ReactElement {
  const isAuthenticated = useAuthStore((s) => s.accessToken !== null);
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const socket = io(API_URL, {
      auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
      transports: ["websocket"],
    });
    socketRef.current = socket;

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);
    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated]);

  const subscribeToBuild = useCallback((buildId: string, handlers: BuildSubscriptionHandlers) => {
    const socket = socketRef.current;
    if (!socket) return () => {};

    const onLog = (payload: BuildLogPayload) => {
      if (payload.buildId === buildId) handlers.onLog?.(payload.chunk);
    };
    const onStatus = (payload: BuildStatusPayload) => {
      if (payload.buildId === buildId) handlers.onStatus?.(payload.status);
    };

    socket.emit("subscribe:build", buildId);
    socket.on("build:log", onLog);
    socket.on("build:status", onStatus);

    return () => {
      socket.emit("unsubscribe:build", buildId);
      socket.off("build:log", onLog);
      socket.off("build:status", onStatus);
    };
  }, []);

  const value = useMemo(() => ({ connected, subscribeToBuild }), [connected, subscribeToBuild]);

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used within a SocketProvider");
  return ctx;
}
