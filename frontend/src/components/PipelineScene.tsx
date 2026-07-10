import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useScrollPipeline } from "@/hooks/useScrollPipeline";
import { cn } from "@/lib/utils";

const LOG_LINES: { text: string; tone: "dim" | "bright" | "route" | "beacon" }[] = [
  { text: "$ webhook received  main@4f2a9c1", tone: "dim" },
  { text: "$ pulling repository...", tone: "dim" },
  { text: "$ container started (isolated)", tone: "route" },
  { text: "$ npm ci", tone: "dim" },
  { text: "$ npm run build", tone: "dim" },
  { text: "  build output: dist/ (18 files, 1.4mb)", tone: "bright" },
  { text: "$ uploading to s3://shipyard-builds/storefront/", tone: "route" },
  { text: "$ routing storefront-4f2a.shpit.uk → edge", tone: "route" },
  { text: "  deployment live", tone: "beacon" },
];

const TONE_CLASS: Record<(typeof LOG_LINES)[number]["tone"], string> = {
  dim: "text-manifest-dim",
  bright: "text-manifest",
  route: "text-route",
  beacon: "text-beacon",
};

function ConnectorLabel({ label, tone }: { label: string; tone: "beacon" | "route" }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-3.5">
      <span className={cn("h-px w-7", tone === "beacon" ? "bg-beacon/50" : "bg-route/50")} />
      <span className={cn("font-mono text-xs", tone === "beacon" ? "text-beacon" : "text-route")}>{label}</span>
      <span className={cn("h-px w-7", tone === "beacon" ? "bg-beacon/50" : "bg-route/50")} />
    </div>
  );
}

export function PipelineScene() {
  const { sectionRef, repoRef, buildRef, deployRef, repoActive, buildActive, deployActive, reducedMotion } =
    useScrollPipeline();
  const [revealed, setRevealed] = useState(reducedMotion ? LOG_LINES.length : 0);

  useEffect(() => {
    if (!buildActive || reducedMotion || revealed >= LOG_LINES.length) return;
    const timer = setTimeout(() => setRevealed((n) => n + 1), 420);
    return () => clearTimeout(timer);
  }, [buildActive, revealed, reducedMotion]);

  const buildDone = revealed >= LOG_LINES.length;
  const isLive = deployActive && buildDone;

  return (
    <section ref={sectionRef} className="bg-hull px-6 py-16 md:py-24">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-baseline gap-3.5">
          <span className="font-mono text-xs uppercase tracking-[0.08em] text-route">the pipeline, live</span>
          <span className="h-px flex-1 bg-line-soft" />
        </div>

        <motion.div
          ref={repoRef}
          initial={{ opacity: 0, y: 16 }}
          animate={repoActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="border border-line bg-deckplate"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3 font-mono text-xs text-manifest-dim">
            <span>acme/storefront · main</span>
            <span className="text-route">4f2a9c1</span>
          </div>
          <div className="space-y-2 px-4 py-4 font-mono text-[13px] leading-relaxed text-manifest-dim">
            <p>▶ src/</p>
            <p>▶ public/</p>
            <p className="text-manifest">▼ package.json</p>
            <p className="pl-4">vite.config.ts</p>
            <p className="pl-4">README.md</p>
          </div>
          <div className="border-t border-line px-4 py-3 font-mono text-xs text-manifest-faint">
            fix: nav overflow on mobile
          </div>
        </motion.div>

        <ConnectorLabel label="webhook: push" tone="beacon" />

        <motion.div
          ref={buildRef}
          initial={{ opacity: 0, y: 16 }}
          animate={buildActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="border border-line bg-hull-deep"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3 font-mono text-xs text-manifest-dim">
            <span>build · isolated container</span>
            <span
              className={cn(
                "px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.06em]",
                buildDone ? "bg-beacon/15 text-beacon" : "bg-signal/15 text-signal",
              )}
            >
              {buildDone ? "live" : "building"}
            </span>
          </div>
          <div className="min-h-[13rem] px-4 py-4 font-mono text-[12.5px] leading-loose">
            {LOG_LINES.slice(0, revealed).map((line) => (
              <p key={line.text} className={TONE_CLASS[line.tone]}>
                {line.text}
              </p>
            ))}
            {!buildDone && buildActive && (
              <span className="inline-block h-3.5 w-2 translate-y-0.5 animate-[blink-cursor_1s_step-end_infinite] bg-signal" />
            )}
          </div>
        </motion.div>

        <ConnectorLabel label="s3 sync + edge routing" tone="route" />

        <motion.div
          ref={deployRef}
          initial={{ opacity: 0, y: 16 }}
          animate={deployActive ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="border border-line bg-deckplate"
        >
          <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
            <span className="flex gap-1.5">
              <span className="h-2 w-2 rounded-full bg-line" />
              <span className="h-2 w-2 rounded-full bg-line" />
              <span className="h-2 w-2 rounded-full bg-line" />
            </span>
            <span className="flex-1 truncate border border-line bg-hull-deep px-3 py-1 font-mono text-xs">
              <span className="text-manifest-faint">https://</span>
              <span className="text-manifest">storefront-4f2a</span>
              <span className="text-manifest-faint">.shpit.uk</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2.5 px-6 py-9">
            <span className={cn("h-2 w-2 rounded-full", isLive ? "animate-pulse-slow bg-beacon" : "bg-manifest-faint")} />
            <span className={cn("font-mono text-sm", isLive ? "text-manifest" : "text-manifest-faint")}>
              {isLive ? "storefront-4f2a.shpit.uk is live" : "awaiting deployment…"}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
