import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PipelineScene } from "@/components/PipelineScene";
import { MagneticButton } from "@/components/MagneticButton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#how", label: "How it builds" },
  { href: "#config", label: "Config" },
  { href: "#compare", label: "Compare" },
];

const RECENT_ACTIVITY = [
  { repo: "acme/storefront", subdomain: "storefront-4f2a.shpit.uk", status: "success" },
  { repo: "kip/docs-site", subdomain: "docs-site-9be1.shpit.uk", status: "building" },
  { repo: "rho/marketing", subdomain: "marketing-2c7f.shpit.uk", status: "success" },
] as const;

const HOW_IT_WORKS: { title: string; body: string; code: string; tone: "signal" | "beacon" | "route" }[] = [
  {
    title: "Webhook trigger",
    body: "A push to your default branch fires a GitHub webhook straight into the build queue — no polling your repo on a schedule.",
    code: "POST /webhooks/github  X-GitHub-Event: push",
    tone: "signal",
  },
  {
    title: "Isolated container",
    body: "Your install and build commands run in a throwaway Docker container on its own network, capped on CPU, memory, and wall-clock time.",
    code: "docker run --rm --network shipyard-build-net",
    tone: "beacon",
  },
  {
    title: "Static output to S3",
    body: "Whatever your build writes to the output directory syncs straight to S3, scoped to that build — nothing else persists.",
    code: "s3://shipyard-builds/storefront/{buildId}/",
    tone: "route",
  },
  {
    title: "Edge routing",
    body: "A Cloudflare Worker resolves your subdomain out of KV and serves straight from S3 at the edge — no per-deployment DNS record to wait on.",
    code: "storefront-4f2a.shpit.uk  →  Worker + KV",
    tone: "signal",
  },
  {
    title: "Live log streaming",
    body: "Build output streams to your browser over a socket as it happens, not after the fact. A failed build shows you the exact line it died on.",
    code: "build:log  ·  build:status",
    tone: "beacon",
  },
];

const DETECT_LINES = [
  { text: "$ detecting install command...", tone: "dim" },
  { text: "  found package-lock.json → npm ci", tone: "bright" },
  { text: "$ detecting build command...", tone: "dim" },
  { text: "  no override set → npm run build", tone: "bright" },
  { text: "$ detecting output directory...", tone: "dim" },
  { text: "  no override set → dist", tone: "bright" },
] as const;

const COMPARISONS = [
  { before: "Provision and patch your own CI runner.", after: "Push triggers a fresh isolated container automatically." },
  {
    before: "Hand-write routing for every subdomain.",
    after: "A Cloudflare Worker resolves your subdomain from KV the moment it's live.",
  },
  {
    before: "Set up storage and access policy per project.",
    after: "Storage is scoped to your repo from the moment you connect it.",
  },
  {
    before: "SSH in or tail log files to see why a deploy failed.",
    after: "Logs stream to your browser over a socket as the build runs.",
  },
  {
    before: "Guess which commit is actually live.",
    after: "Every deployment is tied to the exact commit and build that produced it.",
  },
];

const TONE_TEXT: Record<"signal" | "beacon" | "route", string> = {
  signal: "text-signal",
  beacon: "text-beacon",
  route: "text-route",
};

function SectionLabel({ children, tone = "route" }: { children: string; tone?: "signal" | "beacon" | "route" }) {
  return (
    <div className="mb-8 flex items-baseline gap-3.5 md:mb-11">
      <span className={cn("font-mono text-xs uppercase tracking-[0.08em]", TONE_TEXT[tone])}>{children}</span>
      <span className="h-px flex-1 bg-line-soft" />
    </div>
  );
}

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-7 w-7 items-center justify-center bg-signal font-mono text-xs font-bold text-hull-deep">
        SY
      </span>
      <span className="font-display text-xl font-extrabold uppercase tracking-wide text-manifest">Shipyard</span>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="bg-hull">
      <nav className=" inset-x-0 top-0 z-20 flex items-center justify-between border-b border-line-soft bg-hull px-5 py-4 md:px-16 md:py-5">
        <Wordmark />
        <div className="flex items-center gap-5 md:gap-8">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hidden text-sm font-medium text-manifest-dim hover:text-manifest md:inline"
            >
              {link.label}
            </a>
          ))}
          <Button asChild size="sm">
            <Link to="/login">Connect repo</Link>
          </Button>
        </div>
      </nav>

      {/* Invisible clone of the nav above, in normal flow — reserves its exact height so page content doesn't jump under the fixed nav */}
      <div aria-hidden className="invisible flex items-center justify-between px-5 py-4 md:px-16 md:py-5">
        <Wordmark />
        <div className="flex items-center gap-5 md:gap-8">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="hidden text-sm font-medium md:inline">
              {link.label}
            </a>
          ))}
          <Button asChild size="sm">
            <span>Connect repo</span>
          </Button>
        </div>
      </div>

      <section className="relative overflow-hidden px-5 pb-12 pt-14 md:px-16 md:pb-20 md:pt-28">
        <div className="stripe absolute right-0 top-0 h-3.5 w-56 opacity-90" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-16">
          <div>
            <h1 className="max-w-[16ch] font-display text-[42px] font-extrabold uppercase leading-[0.94] tracking-wide text-manifest md:text-[88px]">
              Push to main.
              <br />
              It ships itself.
            </h1>
            <p className="mt-7 max-w-2xl text-[17px] leading-relaxed text-manifest-dim md:text-xl">
              A webhook fires the instant you push. An isolated container builds your repo with nothing else
              running on it. The static output lands in S3 and goes live on your own subdomain — while the log
              streams to your browser line by line.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <MagneticButton>
                <Button asChild size="lg">
                  <Link to="/login">Connect GitHub repo</Link>
                </Button>
              </MagneticButton>
              <div className="font-mono text-sm text-manifest-faint">
                https://<span className="text-manifest">storefront</span>.shpit.uk
              </div>
            </div>
          </div>

          <div className="border border-line bg-deckplate">
            <div className="border-b border-line px-4 py-3 font-mono text-xs uppercase tracking-[0.06em] text-manifest-faint">
              Recent activity
            </div>
            <div className="divide-y divide-line-soft font-mono text-[13px]">
              {RECENT_ACTIVITY.map((row) => (
                <div key={row.repo} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <span className="truncate text-manifest-dim">{row.repo}</span>
                  <span className="truncate text-route">{row.subdomain}</span>
                  <span className={cn("shrink-0", row.status === "success" ? "text-beacon" : "text-signal")}>
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <PipelineScene />

      <section id="how" className="px-5 pb-16 pt-4 md:px-16 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <SectionLabel tone="route">what actually happens</SectionLabel>
          <div className="grid gap-px bg-line-soft md:grid-cols-3 lg:grid-cols-5">
            {HOW_IT_WORKS.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="flex flex-col gap-3 bg-deckplate p-5"
              >
                <h3 className={cn("font-display text-lg font-bold uppercase tracking-wide", TONE_TEXT[item.tone])}>
                  {item.title}
                </h3>
                <p className="flex-1 text-sm leading-relaxed text-manifest-dim">{item.body}</p>
                <p className="break-all border-t border-line-soft pt-2.5 font-mono text-xs text-manifest-faint">
                  {item.code}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="config" className="px-5 pb-16 md:px-16 md:pb-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 md:grid-cols-2 md:gap-14">
          <div>
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-beacon">zero-config by default</span>
            <h2 className="my-4 font-display text-3xl font-extrabold uppercase leading-tight tracking-wide text-manifest md:text-[44px]">
              No build config to write.
            </h2>
            <p className="max-w-md text-base leading-relaxed text-manifest-dim">
              Push a repo with a lockfile Shipyard recognizes and a build script in your package.json, and
              there's nothing else to set up — the container runs the same detection any of us would by hand.
            </p>
          </div>
          <div className="border border-line bg-hull-deep">
            <div className="flex items-center justify-between border-b border-line px-4 py-3 font-mono text-xs text-manifest-dim">
              <span>detect · storefront</span>
              <span className="text-route">acme/storefront</span>
            </div>
            <div className="space-y-2 overflow-x-auto px-5 py-5 font-mono text-[13px] leading-loose">
              {DETECT_LINES.map((line) => (
                <p key={line.text} className={cn("whitespace-pre", line.tone === "dim" ? "text-manifest-dim" : "text-manifest")}>
                  {line.text}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="compare" className="px-5 pb-16 md:px-16 md:pb-24">
        <div className="mx-auto max-w-6xl">
          <SectionLabel tone="route">what you stop doing</SectionLabel>
          <div className="border border-line">
            <div className="grid grid-cols-2 bg-beacon text-hull-deep">
              <div className="border-r border-hull-deep/15 px-5 py-3.5 font-mono text-[13px] font-semibold uppercase tracking-[0.05em]">
                Without Shipyard
              </div>
              <div className="px-5 py-3.5 font-mono text-[13px] font-semibold uppercase tracking-[0.05em]">With Shipyard</div>
            </div>
            {COMPARISONS.map((row) => (
              <div key={row.before} className="grid grid-cols-2 border-t border-line">
                <div className="border-r border-line px-5 py-4 text-sm leading-relaxed text-manifest-dim">{row.before}</div>
                <div className="px-5 py-4 text-sm leading-relaxed text-manifest">{row.after}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-16 md:pb-28">
        <div className="relative mx-auto max-w-6xl overflow-hidden border border-line bg-deckplate p-9 md:p-16">
          <div className="stripe absolute bottom-0 left-0 h-2.5 w-full opacity-90" />
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <h2 className="font-display text-3xl font-extrabold uppercase leading-tight tracking-wide text-manifest md:text-[42px]">
                Point it at a repo.
                <br />
                Watch it build.
              </h2>
              <p className="mt-2 text-[15.5px] text-manifest-dim">Connect a repo and the next push builds itself.</p>
            </div>
            <MagneticButton>
              <Button asChild size="lg">
                <Link to="/login">Connect GitHub repo</Link>
              </Button>
            </MagneticButton>
          </div>
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-line-soft px-5 py-7 md:px-16">
        <Wordmark />
        <span className="font-mono text-xs text-manifest-faint">your-repo.shpit.uk</span>
        <span className="text-xs text-manifest-faint">© {new Date().getFullYear()} Shipyard</span>
      </footer>
    </div>
  );
}