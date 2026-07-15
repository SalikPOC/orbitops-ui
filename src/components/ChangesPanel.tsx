"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { discardComponents, pullChanges, requestDeveloperHelp, type ActionResult } from "@/lib/actions";
import { copy } from "@/lib/copy";
import type { FlowDiffModel } from "@/lib/flow-diff";
import { FlowDiffViewer } from "@/components/FlowDiffViewer";

interface FileRow {
  filename: string;
  status: string;
  summary: string;
  patch?: string;
}

const statusDot: Record<string, string> = {
  added: "text-emerald-500",
  removed: "text-red-500",
  modified: "text-blue-500",
};

function PatchView({ patch }: { patch: string }) {
  return (
    <pre className="mt-2 max-h-72 overflow-auto rounded-lg bg-zinc-950 p-3 text-[11px] leading-relaxed text-zinc-300">
      {patch.split("\n").map((line, i) => (
        <div
          key={i}
          className={
            line.startsWith("+") ? "text-emerald-400" : line.startsWith("-") ? "text-red-400" : line.startsWith("@@") ? "text-indigo-400" : ""
          }
        >
          {line}
        </div>
      ))}
    </pre>
  );
}

export function ChangesPanel({ files, headBranch, baseBranch, sourceOrgs, prNumber, conflicted, flowDiffs = {} }: {
  files: FileRow[];
  headBranch: string;
  baseBranch: string;
  sourceOrgs: { key: string; label: string }[];
  prNumber: number;
  conflicted: boolean;
  flowDiffs?: Record<string, FlowDiffModel>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sourceOrg, setSourceOrg] = useState(sourceOrgs[0]?.key ?? "INT");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const router = useRouter();

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) setTimeout(() => router.refresh(), 4000);
    });

  const toggle = (f: string) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });

  return (
    <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{copy.changes.title}</h2>
        <div className="flex items-center gap-2">
          {sourceOrgs.length > 1 && (
            <select
              value={sourceOrg}
              onChange={(e) => setSourceOrg(e.target.value)}
              disabled={pending}
              aria-label={copy.changes.fromOrg}
              className="rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {sourceOrgs.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => run(() => pullChanges(headBranch, sourceOrg))}
            disabled={pending}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {pending ? "Working…" : copy.changes.pull}
          </button>
        </div>
      </div>

      {files.length === 0 ? (
        <p className="text-sm text-zinc-500">{copy.changes.empty}</p>
      ) : (
        <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {files.map((f) => (
            <li key={f.filename} className="py-2">
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.has(f.filename)}
                  onChange={() => toggle(f.filename)}
                  aria-label={`select ${f.filename}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm">
                    <span className={`mr-1 ${statusDot[f.status] ?? "text-zinc-400"}`}>●</span>
                    {f.summary}
                  </div>
                  <div className="truncate text-[11px] text-zinc-400">{f.filename}</div>
                  {flowDiffs[f.filename] && (
                    <details className="mt-1" open>
                      <summary className="cursor-pointer text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                        {copy.changes.visualComparison}
                      </summary>
                      <FlowDiffViewer model={flowDiffs[f.filename]} />
                    </details>
                  )}
                  {f.patch && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                        {copy.changes.showDetails}
                      </summary>
                      <PatchView patch={f.patch} />
                    </details>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {files.length > 0 && (
          <button
            onClick={() => run(() => discardComponents(headBranch, baseBranch, [...selected]))}
            disabled={pending || selected.size === 0}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            {copy.changes.removeSelected(selected.size)}
          </button>
        )}
        {conflicted && (
          <button
            onClick={() => run(() => requestDeveloperHelp(prNumber))}
            disabled={pending}
            className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:opacity-40 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-900/20"
          >
            {copy.changes.askForHelp}
          </button>
        )}
      </div>
      {result && (
        <p className={`mt-2 text-sm ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {result.message}
        </p>
      )}
    </section>
  );
}
