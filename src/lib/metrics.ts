import type { DeployManifest } from "./types";

export interface Metrics {
  releases: number;
  rollbacks: number;
  last7Days: number;
  /** % of state changes that were back-outs — DORA change-failure-rate proxy. */
  changeFailureRate: number;
}

export function computeMetrics(events: DeployManifest[]): Metrics {
  const releases = events.filter((m) => m.type === "deploy").length;
  const rollbacks = events.filter((m) => m.type === "rollback").length;
  const last7Days = events.filter(
    (m) => Date.now() - new Date(m.timestamp).getTime() < 7 * 86_400_000
  ).length;
  const total = releases + rollbacks;
  return {
    releases,
    rollbacks,
    last7Days,
    changeFailureRate: total ? Math.round((rollbacks / total) * 100) : 0,
  };
}
