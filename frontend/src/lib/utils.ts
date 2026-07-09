import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const diffSeconds = Math.round((then - Date.now()) / 1000);
  const divisions: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
    ["second", 1],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, secondsInUnit] of divisions) {
    if (Math.abs(diffSeconds) >= secondsInUnit || unit === "second") {
      return rtf.format(Math.round(diffSeconds / secondsInUnit), unit);
    }
  }
  return "—";
}

export function shortSha(sha: string): string {
  return sha.slice(0, 7);
}
