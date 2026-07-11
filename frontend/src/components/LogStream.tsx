import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { api, type BuildStatus } from "@/lib/api";
import { useSocket } from "@/context/SocketContext";
import { cn } from "@/lib/utils";

interface LogStreamProps {
  buildId: string;
  status: BuildStatus;
  onStatusChange?: (status: BuildStatus) => void;
  className?: string;
}

function lineTone(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes("error") || lower.includes("failed")) return "text-hazard";
  if (lower.includes("warn")) return "text-signal";
  return "text-manifest";
}

export function LogStream({ buildId, status, onStatusChange, className }: LogStreamProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const { subscribeToBuild } = useSocket();
  const onStatusChangeRef = useRef(onStatusChange);
  onStatusChangeRef.current = onStatusChange;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLines([]);
    api.builds
      .getLogs(buildId)
      .then(({ log }) => {
        if (cancelled) return;
        setLines(log ? log.split("\n") : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [buildId]);

  useEffect(() => {
    const unsubscribe = subscribeToBuild(buildId, {
      onLog: (chunk) => setLines((prev) => [...prev, ...chunk.split("\n")]),
      onStatus: (nextStatus) => onStatusChangeRef.current?.(nextStatus as BuildStatus),
    });
    return unsubscribe;
  }, [buildId, subscribeToBuild]);

  useEffect(() => {
    if (!stickToBottomRef.current) return;
    const el = containerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  function handleScroll() {
    const el = containerRef.current;
    if (!el) return;
    stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
  }

  const isLive = status === "queued" || status === "running";

  return (
    <div className={cn("flex flex-col overflow-hidden rounded-[3px] border border-line bg-hull-deep", className)}>
      <div className="flex items-center justify-between border-b border-line bg-deckplate px-3 py-2">
        <span className="font-mono text-xs text-manifest-dim">build log</span>
        <span className="font-mono text-xs text-manifest-faint">{lines.length} lines</span>
      </div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="max-h-[28rem] min-h-[16rem] overflow-y-auto px-4 py-3 font-mono text-[13px] leading-relaxed"
      >
        {loading ? (
          <p className="text-manifest-faint">reading log…</p>
        ) : lines.length === 0 ? (
          <p className="text-manifest-faint">
            {status === "queued" ? "waiting for the build to start…" : "no output yet"}
          </p>
        ) : (
          lines.map((line, i) => (
            <div key={i} className="flex gap-3">
              <span className="w-8 shrink-0 select-none text-right text-manifest-faint">{i + 1}</span>
              <span className={cn("whitespace-pre-wrap break-all", lineTone(line))}>{line || " "}</span>
            </div>
          ))
        )}
        {isLive && <span className="mt-1 inline-block h-3.5 w-2 animate-pulse-slow bg-signal align-middle" />}
      </div>
    </div>
  );
}
