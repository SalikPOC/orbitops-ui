import type { ActiveRun } from "./data";
import type { Promotion } from "./types";
import { fmtStage } from "./format";

/**
 * The pipeline board's triage strip: everything actionable or stuck, computed
 * from data the page already fetched (no extra API calls). Severity drives
 * color + ordering: act (you must do something) > warn (something is off) >
 * ready (a change is waiting on a human to promote).
 */
export interface AttentionItem {
  severity: "act" | "warn" | "ready";
  text: string;
  actionLabel: string;
  href: string;
  external?: boolean;
}

/** "3m" / "2h" / "1d 4h" — compact age for status chips and stuck detection. */
export function fmtAge(iso: string, now = Date.now()): string {
  const mins = Math.max(1, Math.round((now - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

const STUCK_AFTER_MS = 30 * 60_000; // an in-progress deploy longer than this deserves a look

export function buildAttention(
  stages: { branch: string; environment: string }[],
  promotions: Promotion[],
  activeRuns: (ActiveRun | null)[],
  now = Date.now()
): AttentionItem[] {
  const items: AttentionItem[] = [];

  stages.forEach((stage, i) => {
    const run = activeRuns[i];
    if (!run) return;
    const age = fmtAge(run.startedAt, now);
    if (run.status === "waiting") {
      items.push({
        severity: "act",
        text: `A release to ${fmtStage(stage.environment)} is waiting for release-manager approval (${age})`,
        actionLabel: "View progress",
        href: run.url,
        external: true,
      });
    } else if (now - new Date(run.startedAt).getTime() > STUCK_AFTER_MS) {
      items.push({
        severity: "warn",
        text: `The release to ${fmtStage(stage.environment)} has been running for ${age} — it may be stuck`,
        actionLabel: "View progress",
        href: run.url,
        external: true,
      });
    }
  });

  for (const p of promotions) {
    const env = fmtStage(stages.find((s) => s.branch === p.baseBranch)?.environment ?? p.baseBranch);
    const failing = p.checks.some((c) => c.status === "failure");
    const running = p.checks.some((c) => c.status === "pending");
    const label = p.workItems[0] ?? `#${p.number}`;
    if (p.mergeable === false) {
      items.push({
        severity: "warn",
        text: `${label} "${p.title}" overlaps with another change — a developer needs to look`,
        actionLabel: "Open it",
        href: `/promotions/${p.number}`,
      });
    } else if (failing) {
      items.push({
        severity: "act",
        text: `${label} "${p.title}" has checks that need attention`,
        actionLabel: "See what failed",
        href: `/promotions/${p.number}`,
      });
    } else if (!running) {
      items.push({
        severity: "ready",
        text: `${label} "${p.title}" passed every check and is ready to promote to ${env}`,
        actionLabel: `Promote to ${env}`,
        href: `/promotions/${p.number}`,
      });
    }
    // checks still running → the stage column's card already shows "Checks are running…"
  }

  const order = { act: 0, warn: 1, ready: 2 };
  return items.sort((a, b) => order[a.severity] - order[b.severity]);
}
