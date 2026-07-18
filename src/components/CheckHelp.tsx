"use client";
import { useState, useTransition } from "react";
import { copy } from "@/lib/copy";
import { requestDeveloperHelp, rerunPromotionChecks, type ActionResult } from "@/lib/actions";
import type { CheckChip } from "@/lib/types";

/**
 * The "What needs attention" panel: one plain-language card per failing
 * check — what it means, what to do, and buttons to open the full report or
 * hand the change to a developer. Citizen devs should never have to decode a
 * red chip.
 */
export function CheckHelp({ checks, prNumber }: { checks: CheckChip[]; prNumber: number }) {
  const failing = checks.filter((c) => c.status === "failure");
  const running = checks.some((c) => c.status === "pending");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);

  if (!failing.length) {
    return running ? <p className="mt-3 text-sm text-zinc-500">{copy.checkHelp.running}</p> : null;
  }

  const askDev = (checkName: string, label: string) =>
    startTransition(async () => {
      const r = await requestDeveloperHelp(
        prNumber,
        `the “${label}” check (${checkName}) is failing and needs a developer's eyes`
      );
      setResult(r);
    });

  const retry = () =>
    startTransition(async () => {
      setResult(await rerunPromotionChecks(prNumber));
    });

  return (
    <div className="mt-4">
      <h3 className="mb-1 text-sm font-semibold text-red-800 dark:text-red-300">{copy.checkHelp.title}</h3>
      <p className="mb-2 text-sm text-zinc-500">{copy.checkHelp.intro(failing.length)}</p>
      <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-800/40">
        <button
          onClick={retry}
          disabled={pending}
          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
        >
          {pending ? copy.checkHelp.retrying : `↻ ${copy.checkHelp.retry}`}
        </button>
        <span className="text-xs text-zinc-500">{copy.checkHelp.retryHint}</span>
      </div>
      <div className="space-y-2">
        {failing.map((c) => {
          const info = copy.checkLabels[c.name];
          return (
            <div
              key={c.name}
              className="rounded-xl border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-900/20"
            >
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-red-900 dark:text-red-200">
                <span aria-hidden>✕</span>
                {info?.label ?? c.name}
              </div>
              <p className="text-sm text-red-900/90 dark:text-red-200/90">{info?.failed ?? copy.checkHelp.fallbackFailed}</p>
              <p className="mt-2 text-sm text-red-900/90 dark:text-red-200/90">
                <span className="font-semibold">{copy.checkHelp.whatToDo}: </span>
                {info?.fix ?? copy.checkHelp.fallbackFix}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-900/30"
                  >
                    {copy.checkHelp.openReport} ↗
                  </a>
                )}
                <button
                  onClick={() => askDev(c.name, info?.label ?? c.name)}
                  disabled={pending}
                  className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
                >
                  {pending ? "…" : copy.checkHelp.askDev}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {running && <p className="mt-2 text-sm text-zinc-500">{copy.checkHelp.running}</p>}
      {result && (
        <p className={`mt-2 text-sm font-medium ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
