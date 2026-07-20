import "server-only";
import {
  getDeployHistory,
  getInProgressChanges,
  getOpenPromotions,
  getPipeline,
} from "./data";
import type { Promotion, Stage } from "./types";

/**
 * The work-item-centric view of the pipeline (the Copado "user story" mental
 * model): one summary per work item, aggregated from in-progress branches,
 * open promotions, and the deploy manifests — so a builder can answer
 * "where is POC-7 and what do I do next?" from a single card.
 */
export type WorkItemState =
  | "building" // branch exists, no promotion yet
  | "checks" // promotion open, checks running
  | "attention" // promotion open, a check failed
  | "conflict" // promotion overlaps another change
  | "ready" // promotion open, everything green
  | "released"; // no open work; it has shipped somewhere

export interface WorkItemEnvStatus {
  environment: string;
  released: boolean;
  seq?: number;
  timestamp?: string;
}

export interface WorkItemSummary {
  id: string;
  title: string;
  state: WorkItemState;
  /** Environment the open promotion targets (when there is one). */
  targetEnv?: string;
  branch?: string;
  promotionNumber?: number;
  /** Per-stage shipped/not-shipped, pipeline order — the ✓ INT ✓ UAT ○ PROD strip. */
  envs: WorkItemEnvStatus[];
  /** Where to go to act on it. */
  href: string;
}

function promotionState(p: Promotion): WorkItemState {
  if (p.mergeable === false) return "conflict";
  if (p.checks.some((c) => c.status === "failure")) return "attention";
  if (p.checks.some((c) => c.status === "pending")) return "checks";
  return "ready";
}

const STATE_ORDER: Record<WorkItemState, number> = {
  attention: 0,
  conflict: 1,
  ready: 2,
  checks: 3,
  building: 4,
  released: 5,
};

export async function getWorkItemBoard(): Promise<{ stages: Stage[]; items: WorkItemSummary[] }> {
  const stages = await getPipeline();
  const [histories, promotions, inProgress] = await Promise.all([
    Promise.all(stages.map((s) => getDeployHistory(s.environment))),
    getOpenPromotions(stages.map((s) => s.branch)),
    getInProgressChanges(stages[0]?.branch ?? "integration"),
  ]);

  const items = new Map<string, WorkItemSummary>();
  const blank = (id: string): WorkItemSummary => ({
    id,
    title: id,
    state: "released",
    envs: stages.map((s) => ({ environment: s.environment, released: false })),
    href: "/deployments",
  });
  const upsert = (id: string) => {
    const existing = items.get(id);
    if (existing) return existing;
    const fresh = blank(id);
    items.set(id, fresh);
    return fresh;
  };

  // Shipped work, from the deploy manifests (newest deploy per env wins).
  stages.forEach((stage, i) => {
    for (const m of histories[i]) {
      if (m.type !== "deploy") continue;
      for (const wi of m.workItems) {
        const item = upsert(wi);
        const env = item.envs.find((e) => e.environment === stage.environment)!;
        if (!env.released) Object.assign(env, { released: true, seq: m.seq, timestamp: m.timestamp });
      }
    }
  });

  // Open promotions override: the work item is on its way somewhere.
  for (const p of promotions) {
    const targetEnv = stages.find((s) => s.branch === p.baseBranch)?.environment ?? p.baseBranch;
    for (const wi of p.workItems) {
      const item = upsert(wi);
      item.title = p.title;
      item.state = promotionState(p);
      item.targetEnv = targetEnv;
      item.promotionNumber = p.number;
      item.href = `/promotions/${p.number}`;
    }
  }

  // Branches still being built (no promotion yet).
  for (const c of inProgress) {
    for (const wi of c.workItems) {
      const item = upsert(wi);
      item.title = c.title;
      item.state = "building";
      item.branch = c.branch;
      item.href = `/changes/${c.branch}`;
    }
  }

  return {
    stages,
    items: [...items.values()].sort((a, b) => STATE_ORDER[a.state] - STATE_ORDER[b.state] || a.id.localeCompare(b.id)),
  };
}
