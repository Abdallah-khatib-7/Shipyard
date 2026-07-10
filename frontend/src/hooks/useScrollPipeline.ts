import { useEffect, useRef, useState, type RefObject } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

interface UseScrollPipelineResult {
  sectionRef: RefObject<HTMLDivElement | null>;
  repoRef: RefObject<HTMLDivElement | null>;
  buildRef: RefObject<HTMLDivElement | null>;
  deployRef: RefObject<HTMLDivElement | null>;
  repoActive: boolean;
  buildActive: boolean;
  deployActive: boolean;
  reducedMotion: boolean;
}

/**
 * Drives the landing page's signature build-pipeline scene. Each panel (repo,
 * build, deploy) activates independently via its own ScrollTrigger as it
 * scrolls into view — no pin, since the panels stack tall and a long pin
 * for a vertical stack fights the scroll rather than riding it. The actual
 * card content (log lines typing in, the live pulse) is Framer Motion,
 * driven off the `*Active` booleans this hook returns.
 */
export function useScrollPipeline(): UseScrollPipelineResult {
  const sectionRef = useRef<HTMLDivElement>(null);
  const repoRef = useRef<HTMLDivElement>(null);
  const buildRef = useRef<HTMLDivElement>(null);
  const deployRef = useRef<HTMLDivElement>(null);

  const [repoActive, setRepoActive] = useState(false);
  const [buildActive, setBuildActive] = useState(false);
  const [deployActive, setDeployActive] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(reduce);

    if (reduce) {
      setRepoActive(true);
      setBuildActive(true);
      setDeployActive(true);
      return;
    }

    const ctx = gsap.context(() => {
      const panels: [RefObject<HTMLDivElement | null>, (v: boolean) => void][] = [
        [repoRef, setRepoActive],
        [buildRef, setBuildActive],
        [deployRef, setDeployActive],
      ];

      for (const [ref, setActive] of panels) {
        if (!ref.current) continue;
        ScrollTrigger.create({
          trigger: ref.current,
          start: "top 78%",
          onEnter: () => setActive(true),
          onLeaveBack: () => setActive(false),
        });
      }
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return { sectionRef, repoRef, buildRef, deployRef, repoActive, buildActive, deployActive, reducedMotion };
}
