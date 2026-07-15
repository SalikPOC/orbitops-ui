import Link from "next/link";
import { copy } from "@/lib/copy";
import {
  getActiveDeployRun,
  getDeployHistory,
  getInProgressChanges,
  getOpenPromotions,
  getPipeline,
} from "@/lib/data";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Chip, WorkItemBadge } from "@/components/chips";
import type { Promotion } from "@/lib/types";

export const dynamic = "force-dynamic";

function PromotionCard({ p }: { p: Promotion }) {
  const failing = p.checks.some((c) => c.status === "failure");
  const running = p.checks.some((c) => c.status === "pending");
  return (
    <Link
      href={`/promotions/${p.number}`}
      className="block rounded-xl border border-zinc-200 bg-white p-3 shadow-sm transition hover:shadow dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="mb-1 flex items-center gap-2">
        {p.workItems.map((w) => (
          <WorkItemBadge key={w} id={w} />
        ))}
        <span className="text-xs text-zinc-400">#{p.number}</span>
      </div>
      <div className="mb-2 text-sm font-medium leading-snug">{p.title}</div>
      <div className="mb-2 flex flex-wrap gap-1">
        {p.checks.map((c) => (
          <Chip key={c.name} chip={c} link={false} />
        ))}
      </div>
      <div className="text-xs text-zinc-500">
        {failing
          ? copy.pipeline.checksFailing
          : running
            ? copy.pipeline.checksRunning
            : copy.pipeline.checksPassing}
        {p.mergeable === false && (
          <span className="mt-1 block text-amber-600 dark:text-amber-400">{copy.pipeline.conflict}</span>
        )}
      </div>
    </Link>
  );
}

export default async function PipelinePage() {
  const stages = await getPipeline();
  const [histories, promotions, activeRuns, inProgress] = await Promise.all([
    Promise.all(stages.map((s) => getDeployHistory(s.environment))),
    getOpenPromotions(stages.map((s) => s.branch)),
    Promise.all(stages.map((s) => getActiveDeployRun(s.branch))),
    getInProgressChanges(stages[0]?.branch ?? "integration"),
  ]);

  return (
    <div>
      <AutoRefresh seconds={30} />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.pipeline.title}</h1>
        <Link
          href="/start"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          {copy.startChange.button}
        </Link>
      </div>
      {inProgress.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
            {copy.changes.beingBuilt}
          </h2>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
            {inProgress.map((c) => (
              <Link
                key={c.branch}
                href={`/changes/${c.branch}`}
                className="block rounded-xl border border-dashed border-zinc-300 bg-white p-3 transition hover:border-zinc-400 hover:shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="mb-1 flex items-center gap-2">
                  {c.workItems.map((w) => (
                    <WorkItemBadge key={w} id={w} />
                  ))}
                </div>
                <div className="text-sm font-medium">{c.title}</div>
                <div className="mt-1 text-xs text-zinc-500">{copy.changes.updates(c.aheadCount)}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {stages.map((stage, i) => {
          const latest = histories[i][0];
          const incoming = promotions.filter((p) => p.baseBranch === stage.branch);
          const active = activeRuns[i];
          return (
            <section
              key={stage.environment}
              className="rounded-2xl border border-zinc-200 bg-zinc-100/50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50"
            >
              <header className="mb-3">
                <div className="flex items-baseline justify-between">
                  <h2 className="text-base font-semibold capitalize">{stage.environment}</h2>
                  <span className="text-xs text-zinc-500">{stage.org}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-zinc-500">
                  <span className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800">
                    scan ≤ sev {stage.gates.scannerMaxSeverity}
                  </span>
                  <span className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800">
                    coverage ≥ {stage.gates.minCoverage}%
                  </span>
                  {stage.gates.requiredReviewers && (
                    <span className="rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800">approval required</span>
                  )}
                </div>
              </header>

              {active && (
                <a
                  href={active.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-3 block rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-sm font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-300"
                >
                  {active.status === "waiting" ? copy.releasing.waitingApproval : copy.releasing.inProgress}
                </a>
              )}
              <div className="mb-4 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {copy.pipeline.currentRelease}
                </div>
                {latest ? (
                  <div className="mt-1 text-sm">
                    <span className="font-semibold">#{latest.seq}</span>
                    {latest.type === "rollback" && (
                      <span className="ml-2 rounded bg-orange-100 px-1.5 py-0.5 text-[11px] font-medium text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                        {copy.deployments.backedOut} → #{latest.rolledBackTo}
                      </span>
                    )}
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {new Date(latest.timestamp).toLocaleString()} {copy.deployments.by} {latest.actor}
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-zinc-500">{copy.pipeline.noDeploysYet}</div>
                )}
              </div>

              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                {copy.pipeline.openPromotions}
              </div>
              <div className="space-y-2">
                {incoming.length ? (
                  incoming.map((p) => <PromotionCard key={p.number} p={p} />)
                ) : (
                  <div className="rounded-xl border border-dashed border-zinc-300 p-3 text-sm text-zinc-400 dark:border-zinc-700">
                    {copy.pipeline.noOpenPromotions}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
