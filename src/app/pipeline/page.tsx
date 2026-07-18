import Link from "next/link";
import { Fragment } from "react";
import { fmtDateTime, fmtStage } from "@/lib/format";
import { copy } from "@/lib/copy";
import {
  getActiveDeployRun,
  getDeployHistory,
  getInProgressChanges,
  getOpenPromotions,
  getPendingApprovals,
  getPipeline,
  getSourceOrgs,
  type PendingApproval,
} from "@/lib/data";
import { getSessionUser } from "@/auth";
import { AutoRefresh } from "@/components/AutoRefresh";
import { ApprovalCard } from "@/components/ApprovalCard";
import { Chip, WorkItemBadge } from "@/components/chips";
import { buildAttention, fmtAge, type AttentionItem } from "@/lib/attention";
import type { Promotion } from "@/lib/types";

const attentionStyle: Record<AttentionItem["severity"], { row: string; dot: string }> = {
  act: {
    row: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200",
    dot: "bg-amber-500",
  },
  warn: {
    row: "border-red-300 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200",
    dot: "bg-red-500",
  },
  ready: {
    row: "border-indigo-200 bg-indigo-50 text-indigo-900 dark:border-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-200",
    dot: "bg-indigo-500",
  },
};

function AttentionStrip({ items, approvals, isReleaseManager }: {
  items: AttentionItem[];
  approvals: PendingApproval[];
  isReleaseManager: boolean;
}) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">{copy.attention.title}</h2>
      {approvals.length > 0 && (
        <div className="mb-2 space-y-2">
          {approvals.map((a) => (
            <ApprovalCard key={a.runId} approval={a} isReleaseManager={isReleaseManager} />
          ))}
        </div>
      )}
      {items.length === 0 && approvals.length > 0 ? null : items.length === 0 ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          {copy.attention.allQuiet}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, i) => {
            const s = attentionStyle[item.severity];
            const action = item.external ? (
              <a href={item.href} target="_blank" rel="noreferrer" className="ml-auto shrink-0 text-xs font-semibold underline">
                {item.actionLabel} ↗
              </a>
            ) : (
              <Link href={item.href} className="ml-auto shrink-0 text-xs font-semibold underline">
                {item.actionLabel}
              </Link>
            );
            return (
              <div key={i} className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm ${s.row}`}>
                <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                <span>{item.text}</span>
                {action}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

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

/** The left-to-right connector between stages: an arrow with a waiting count. */
function FlowConnector({ count }: { count: number }) {
  const pill =
    count > 0
      ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300"
      : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500";
  return (
    <>
      {/* Wide screens: horizontal arrow between columns, pinned near the headers */}
      <div className="hidden w-16 shrink-0 flex-col items-center gap-1 pt-14 xl:flex" aria-hidden>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${pill}`}>
          {copy.pipeline.waitingCount(count)}
        </span>
        <svg viewBox="0 0 48 16" className="h-4 w-12 text-zinc-300 dark:text-zinc-700">
          <line x1="0" y1="8" x2="38" y2="8" stroke="currentColor" strokeWidth="2" />
          <path d="M36 2 L46 8 L36 14 Z" fill="currentColor" />
        </svg>
      </div>
      {/* Stacked (mobile): downward arrow between cards */}
      <div className="flex items-center justify-center gap-2 py-1 xl:hidden" aria-hidden>
        <span className="text-zinc-300 dark:text-zinc-700">↓</span>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${pill}`}>
          {copy.pipeline.waitingCount(count)}
        </span>
      </div>
    </>
  );
}

export default async function PipelinePage() {
  const stages = await getPipeline();
  const [histories, promotions, activeRuns, inProgress, approvals, sourceOrgs, user] = await Promise.all([
    Promise.all(stages.map((s) => getDeployHistory(s.environment))),
    getOpenPromotions(stages.map((s) => s.branch)),
    Promise.all(stages.map((s) => getActiveDeployRun(s.branch))),
    getInProgressChanges(stages[0]?.branch ?? "integration"),
    getPendingApprovals(stages),
    getSourceOrgs(),
    getSessionUser(),
  ]);
  const isReleaseManager = user?.role === "release-manager" || user?.role === "admin";

  const approvedEnvs = new Set(approvals.map((a) => a.environment));
  const attention = buildAttention(stages, promotions, activeRuns).filter(
    (item) => !approvals.length || !approvedEnvs.size || !item.text.includes("waiting for release-manager approval")
  );

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
      <AttentionStrip items={attention} approvals={approvals} isReleaseManager={isReleaseManager} />

      <div className="flex flex-col gap-2 xl:flex-row xl:items-stretch xl:gap-0">
        {/* Where work starts: the builders' sandboxes */}
        <section className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-100/40 p-4 xl:flex-1 dark:border-zinc-700 dark:bg-zinc-900/40">
          <header className="mb-3">
            <h2 className="text-base font-semibold">{copy.pipeline.devColumn}</h2>
            <p className="mt-1 text-[11px] text-zinc-500">{copy.pipeline.devColumnHint}</p>
          </header>
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
            {copy.changes.beingBuilt}
          </div>
          <div className="space-y-2">
            {inProgress.length ? (
              inProgress.map((c) => (
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
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-300 p-3 text-sm text-zinc-400 dark:border-zinc-700">
                {copy.pipeline.noOpenPromotions}
              </div>
            )}
          </div>
          {sourceOrgs.length > 0 && (
            <div className="mt-4 border-t border-dashed border-zinc-300 pt-3 text-[11px] text-zinc-500 dark:border-zinc-700">
              {sourceOrgs.map((o) => (
                <div key={o.key} className="truncate py-0.5">
                  🔌 {o.label}
                </div>
              ))}
            </div>
          )}
        </section>

        {stages.map((stage, i) => {
          const latest = histories[i][0];
          const incoming = promotions.filter((p) => p.baseBranch === stage.branch);
          const active = activeRuns[i];
          const from = i === 0 ? copy.pipeline.devColumn : fmtStage(stages[i - 1].environment);
          return (
            <Fragment key={stage.environment}>
              <FlowConnector count={incoming.length} />
              <section className="rounded-2xl border border-zinc-200 bg-zinc-100/50 p-4 xl:flex-1 dark:border-zinc-800 dark:bg-zinc-900/50">
                <header className="mb-3">
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-base font-semibold">{fmtStage(stage.environment)}</h2>
                    <span className="text-xs text-zinc-500">{stage.org}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1 text-[11px] text-zinc-500">
                    <span
                      title={copy.pipeline.gateScan(stage.gates.scannerMaxSeverity)}
                      className="cursor-help rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800"
                    >
                      Code scan
                    </span>
                    <span
                      title={copy.pipeline.gateCoverage(stage.gates.minCoverage)}
                      className="cursor-help rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800"
                    >
                      Tests ≥ {stage.gates.minCoverage}%
                    </span>
                    {stage.gates.requiredReviewers && (
                      <span
                        title={copy.pipeline.gateApproval}
                        className="cursor-help rounded bg-zinc-200 px-1.5 py-0.5 dark:bg-zinc-800"
                      >
                        Approval
                      </span>
                    )}
                  </div>
                </header>

                {active && (
                  <a
                    href={active.url}
                    target="_blank"
                    rel="noreferrer"
                    className={`mb-3 block rounded-xl border p-2.5 text-sm font-medium ${
                      active.status === "waiting"
                        ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200"
                        : "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-300"
                    }`}
                  >
                    {active.status === "waiting" ? copy.releasing.waitingApproval : copy.releasing.inProgress}
                    <span className="ml-1 font-normal opacity-70">
                      · {copy.releasing.for} {fmtAge(active.startedAt)} ↗
                    </span>
                  </a>
                )}

                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {copy.pipeline.openPromotions}{" "}
                  <span className="normal-case text-zinc-400/80">{copy.pipeline.incomingFrom(from)}</span>
                </div>
                <div className="mb-4 space-y-2">
                  {incoming.length ? (
                    incoming.map((p) => <PromotionCard key={p.number} p={p} />)
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-300 p-3 text-sm text-zinc-400 dark:border-zinc-700">
                      {copy.pipeline.noOpenPromotions}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
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
                        {fmtDateTime(latest.timestamp)} {copy.deployments.by} {latest.actor}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-zinc-500">{copy.pipeline.noDeploysYet}</div>
                  )}
                </div>
              </section>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
