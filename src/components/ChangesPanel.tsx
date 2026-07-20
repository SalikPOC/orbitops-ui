"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { discardComponents, getRunState, pullChanges, requestDeveloperHelp, type ActionResult } from "@/lib/actions";
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
  // Gearset/Copado model: ticked = "part of my change". Unticking marks a
  // component as someone else's work; one button removes all unticked.
  const [unticked, setUnticked] = useState<Set<string>>(new Set());
  const [sourceOrg, setSourceOrg] = useState(sourceOrgs[0]?.key ?? "INT");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pull, setPull] = useState<
    | { phase: "idle" }
    | { phase: "running"; url?: string }
    | { phase: "done"; ok: boolean; url?: string; hadFiles: number }
  >({ phase: "idle" });
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) {
        setUnticked(new Set());
        setTimeout(() => router.refresh(), 4000);
      }
    });

  const startPull = () =>
    startTransition(async () => {
      setResult(null);
      setPull({ phase: "running" });
      const r = await pullChanges(headBranch, sourceOrg);
      if (!r.ok) {
        setPull({ phase: "idle" });
        setResult(r);
        return;
      }
      if (!r.runId) return; // couldn't locate the run — leave the spinner; page auto-refresh takes over
      setPull({ phase: "running", url: r.runUrl });
      const before = files.length;
      if (timer.current) clearInterval(timer.current);
      timer.current = setInterval(async () => {
        const s = await getRunState(r.runId!);
        if (s.status === "completed") {
          if (timer.current) clearInterval(timer.current);
          timer.current = null;
          setPull({ phase: "done", ok: s.conclusion === "success", url: s.url, hadFiles: before });
          router.refresh();
        }
      }, 5_000);
    });

  const pulling = pull.phase === "running";
  const justPulled = pull.phase === "done" && pull.ok && files.length > pull.hadFiles;

  const toggle = (f: string) =>
    setUnticked((s) => {
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
            onClick={startPull}
            disabled={pending || pulling}
            className="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {pulling ? "Pulling…" : copy.changes.pull}
          </button>
        </div>
      </div>

      {pulling && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
            <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
          </svg>
          <span>{copy.changes.pulling}</span>
          {pull.phase === "running" && pull.url && (
            <a href={pull.url} target="_blank" rel="noreferrer" className="ml-auto text-xs font-medium underline">
              {copy.changes.openRun} ↗
            </a>
          )}
        </div>
      )}
      {pull.phase === "done" && (
        <div
          className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
            pull.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400"
          }`}
        >
          <span>
            {!pull.ok
              ? copy.changes.pullFailed
              : justPulled
                ? `${copy.changes.pullDone} ${copy.changes.pullReview}`
                : copy.changes.pullNothing}
          </span>
          {pull.url && (
            <a href={pull.url} target="_blank" rel="noreferrer" className="ml-auto text-xs font-medium underline">
              {copy.changes.openRun} ↗
            </a>
          )}
        </div>
      )}

      {files.length === 0 ? (
        <p className="text-sm text-zinc-500">{copy.changes.empty}</p>
      ) : (
        <>
          <p className="mb-1 text-xs text-zinc-400">{copy.changes.keepHint}</p>
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {files.map((f) => (
              <li key={f.filename} className={`py-2 ${unticked.has(f.filename) ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={!unticked.has(f.filename)}
                    onChange={() => toggle(f.filename)}
                    aria-label={`part of this change: ${f.filename}`}
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
        </>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {files.length > 0 && (
          <button
            onClick={() => run(() => discardComponents(headBranch, baseBranch, [...unticked]))}
            disabled={pending || pulling || unticked.size === 0}
            title={unticked.size === 0 ? copy.changes.allKept : undefined}
            className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            {copy.changes.removeUnticked(unticked.size)}
          </button>
        )}
        {conflicted && (
          <button
            onClick={() => run(() => requestDeveloperHelp(prNumber))}
            disabled={pending || pulling}
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
