"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";
import { executeRollback, pollRollback, startRollbackPreview } from "@/lib/actions";
import type { DeployManifest } from "@/lib/types";
import type { RollbackPreview } from "@/lib/data";
import { WorkItemBadge } from "@/components/chips";

type PhaseState =
  | { phase: "idle" }
  | { phase: "previewing"; runId?: number; url?: string }
  | { phase: "previewed"; preview: RollbackPreview }
  | { phase: "executing"; runId?: number; url?: string; waiting?: boolean }
  | { phase: "done"; ok: boolean; url?: string };

function ComponentList({ map, strike }: { map: Record<string, string[]>; strike?: boolean }) {
  return (
    <ul className="mt-1 space-y-0.5 text-sm">
      {Object.entries(map)
        .sort()
        .flatMap(([type, members]) =>
          members.map((m) => (
            <li key={type + m} className="text-zinc-600 dark:text-zinc-300">
              <span className="mr-1 rounded bg-zinc-100 px-1 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800">
                {type}
              </span>
              {strike ? <s>{m}</s> : m}
            </li>
          ))
        )}
    </ul>
  );
}

export function RollbackPanel({ env, target, history, isReleaseManager }: {
  env: string;
  target: DeployManifest;
  history: DeployManifest[];
  isReleaseManager: boolean;
}) {
  const [state, setState] = useState<PhaseState>({ phase: "idle" });
  const [includeDestructive, setIncludeDestructive] = useState(false);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopPolling = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);
  useEffect(() => stopPolling, [stopPolling]);

  const currentSeq = history[0]?.seq ?? 0;
  const backedOutWork = [
    ...new Set(history.filter((m) => m.seq > target.seq).flatMap((m) => m.workItems)),
  ];

  const poll = (runId: number, onDone: (r: Awaited<ReturnType<typeof pollRollback>>) => void) => {
    stopPolling();
    timer.current = setInterval(async () => {
      const r = await pollRollback(runId);
      if (r.status === "waiting") {
        setState((s) => (s.phase === "executing" ? { ...s, waiting: true } : s));
      }
      if (r.status === "completed") {
        stopPolling();
        onDone(r);
      }
    }, 5_000);
  };

  const preview = async () => {
    setError(null);
    setState({ phase: "previewing" });
    const d = await startRollbackPreview(env, target.seq, includeDestructive);
    if (!d.ok || !d.runId) {
      setError(d.message);
      setState({ phase: "idle" });
      return;
    }
    setState({ phase: "previewing", runId: d.runId, url: d.runUrl });
    poll(d.runId, (r) => {
      if (r.preview) setState({ phase: "previewed", preview: r.preview as RollbackPreview });
      else {
        setError(copy.rollback.failed);
        setState({ phase: "idle" });
      }
    });
  };

  const execute = async () => {
    setError(null);
    setState({ phase: "executing" });
    const d = await executeRollback(env, target.seq, includeDestructive, reason);
    if (!d.ok || !d.runId) {
      setError(d.message);
      setState({ phase: "previewed", preview: (state as { preview: RollbackPreview }).preview });
      return;
    }
    setState({ phase: "executing", runId: d.runId, url: d.runUrl });
    poll(d.runId, (r) => {
      setState({ phase: "done", ok: r.conclusion === "success", url: r.url });
      if (r.conclusion === "success") setTimeout(() => router.refresh(), 2_000);
    });
  };

  return (
    <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-900/10">
      <div className="mb-2 text-sm font-semibold">
        {copy.rollback.previewTitle(currentSeq, target.seq)}
      </div>

      {state.phase === "idle" && (
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeDestructive}
              onChange={(e) => setIncludeDestructive(e.target.checked)}
              className="mt-0.5"
            />
            <span>{copy.rollback.includeDestructive}</span>
          </label>
          <button
            onClick={preview}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            Preview
          </button>
        </div>
      )}

      {state.phase === "previewing" && (
        <p className="animate-pulse text-sm text-zinc-600 dark:text-zinc-300">
          {copy.rollback.previewing}{" "}
          {state.url && (
            <a href={state.url} target="_blank" rel="noreferrer" className="text-indigo-600 underline dark:text-indigo-400">
              {copy.rollback.openRun}
            </a>
          )}
        </p>
      )}

      {state.phase === "previewed" && (
        <div className="space-y-4">
          <div>
            <div className="text-sm font-medium">{copy.rollback.restoreList(state.preview.safety.changedCount)}</div>
            {state.preview.safety.changedCount > 0 && <ComponentList map={state.preview.safety.changed} />}
          </div>
          {state.preview.safety.destructiveCount > 0 && (
            <div>
              <div className="text-sm font-medium text-red-700 dark:text-red-400">
                {state.preview.includeDestructive
                  ? `${state.preview.safety.destructiveCount} component(s) will be REMOVED:`
                  : copy.rollback.deleteList(state.preview.safety.destructiveCount)}
              </div>
              <ComponentList map={state.preview.safety.destructive} strike={state.preview.includeDestructive} />
            </div>
          )}
          {state.preview.safety.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-900/20">
              <div className="mb-1 text-sm font-semibold text-amber-800 dark:text-amber-300">
                {copy.rollback.warnings}
              </div>
              <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
                {state.preview.safety.warnings.map((w, i) => (
                  <li key={i}>
                    <span className="font-medium">{w.type} {w.member}</span> — {w.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {backedOutWork.length > 0 && (
            <div>
              <div className="text-sm font-medium">{copy.rollback.workItemsOut}</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {backedOutWork.map((w) => (
                  <WorkItemBadge key={w} id={w} />
                ))}
              </div>
            </div>
          )}
          <p className={`text-sm ${state.preview.validation.succeeded ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
            {state.preview.validation.succeeded ? copy.rollback.validationOk : copy.rollback.validationFailed}
          </p>
          {!state.preview.validation.succeeded && state.preview.validation.errors && (
            <pre className="max-h-48 overflow-auto rounded-lg bg-zinc-950 p-3 text-[11px] text-red-300">
              {state.preview.validation.errors}
            </pre>
          )}

          {state.preview.validation.succeeded &&
            (isReleaseManager ? (
              <div className="space-y-3 border-t border-indigo-200 pt-3 dark:border-indigo-900">
                <div className="text-sm font-semibold">{copy.rollback.executeTitle}</div>
                <div>
                  <label className="mb-1 block text-xs font-medium">{copy.rollback.reasonLabel}</label>
                  <input
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full max-w-md rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                  <p className="mt-0.5 text-xs text-zinc-500">{copy.rollback.reasonHint}</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium">{copy.rollback.confirmLabel(env)}</label>
                  <input
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder={env}
                    className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                  />
                </div>
                <button
                  onClick={execute}
                  disabled={confirm !== env || !reason.trim()}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
                >
                  {copy.rollback.executeButton}
                </button>
              </div>
            ) : (
              <p className="text-sm text-zinc-500">{copy.rollback.managerOnly}</p>
            ))}
        </div>
      )}

      {state.phase === "executing" && (
        <p className="animate-pulse text-sm text-zinc-600 dark:text-zinc-300">
          {state.waiting ? copy.rollback.waitingGate : copy.rollback.executing}{" "}
          {state.url && (
            <a href={state.url} target="_blank" rel="noreferrer" className="text-indigo-600 underline dark:text-indigo-400">
              {copy.rollback.openRun}
            </a>
          )}
        </p>
      )}

      {state.phase === "done" && (
        <p className={`text-sm font-medium ${state.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
          {state.ok ? copy.rollback.done(env) : copy.rollback.failed}{" "}
          {state.url && (
            <a href={state.url} target="_blank" rel="noreferrer" className="underline">
              {copy.rollback.openRun}
            </a>
          )}
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
