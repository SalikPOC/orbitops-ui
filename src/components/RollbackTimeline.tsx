"use client";
import { useState } from "react";
import { copy } from "@/lib/copy";
import type { DeployManifest } from "@/lib/types";
import { WorkItemBadge } from "@/components/chips";
import { RollbackPanel } from "@/components/RollbackPanel";

export function RollbackTimeline({ env, history, isReleaseManager }: {
  env: string;
  history: DeployManifest[]; // newest first
  isReleaseManager: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const currentSeq = history[0]?.seq;

  return (
    <ol className="space-y-2">
      {history.map((m) => {
        const isCurrent = m.seq === currentSeq;
        return (
          <li
            key={m.seq}
            className={`rounded-2xl border bg-white p-4 dark:bg-zinc-900 ${
              isCurrent ? "border-indigo-300 dark:border-indigo-800" : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-semibold">#{m.seq}</span>
              {m.type === "rollback" ? (
                <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                  {copy.deployments.backedOut} → #{m.rolledBackTo}
                </span>
              ) : (
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  {copy.deployments.released}
                </span>
              )}
              {isCurrent && (
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  {copy.rollback.current}
                </span>
              )}
              <span className="ml-auto text-xs text-zinc-500">
                {new Date(m.timestamp).toLocaleString()} {copy.deployments.by} {m.actor}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              {copy.deployments.components(m.componentCount)}
              {m.destructiveCount > 0 && (
                <span className="text-red-600 dark:text-red-400">· {m.destructiveCount} removed</span>
              )}
              {m.workItems.map((w) => (
                <WorkItemBadge key={w} id={w} />
              ))}
              {m.reason && <span className="italic">“{m.reason}”</span>}
              <a
                href={m.runUrl}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-indigo-600 hover:underline dark:text-indigo-400"
              >
                {copy.deployments.viewDetails}
              </a>
            </div>

            {!isCurrent && (
              <div className="mt-2">
                {selected === m.seq ? (
                  <RollbackPanel env={env} target={m} history={history} isReleaseManager={isReleaseManager} />
                ) : (
                  <button
                    onClick={() => setSelected(m.seq)}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    {copy.rollback.backOutTo}
                  </button>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
