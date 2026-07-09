import { cn } from "@/lib/utils";
import type { BuildStatus } from "@/lib/api";

const STATUS_META: Record<BuildStatus, { label: string; dot: string; text: string; pulse?: boolean }> = {
  queued: { label: "queued", dot: "bg-manifest-faint", text: "text-manifest-dim" },
  running: { label: "running", dot: "bg-signal", text: "text-signal", pulse: true },
  success: { label: "live", dot: "bg-beacon", text: "text-beacon" },
  failed: { label: "failed", dot: "bg-hazard", text: "text-hazard" },
  timeout: { label: "timed out", dot: "bg-hazard-dim", text: "text-hazard-dim" },
  cancelled: { label: "cancelled", dot: "bg-manifest-faint", text: "text-manifest-faint" },
};

export function BuildStatusBadge({ status, className }: { status: BuildStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-[0.08em]",
        meta.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot, meta.pulse && "animate-pulse-slow")} />
      {meta.label}
    </span>
  );
}
