"use client";
import { useState, useTransition } from "react";
import { updateGates, type ActionResult } from "@/lib/actions";

export function GateEditor({ stageBranch, environment, minCoverage, scannerMaxSeverity, canEdit }: {
  stageBranch: string;
  environment: string;
  minCoverage: number;
  scannerMaxSeverity: number;
  canEdit: boolean;
}) {
  const [cov, setCov] = useState(minCoverage);
  const [sev, setSev] = useState(scannerMaxSeverity);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<(ActionResult & { prUrl?: string }) | null>(null);
  const dirty = cov !== minCoverage || sev !== scannerMaxSeverity;

  if (!canEdit) {
    return (
      <span className="text-sm text-zinc-600 dark:text-zinc-300">
        coverage ≥ {minCoverage}% · scan blocks ≤ sev {scannerMaxSeverity}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <label className="flex items-center gap-1">
        coverage ≥
        <input
          type="number" min={0} max={100} value={cov}
          onChange={(e) => setCov(Number(e.target.value))}
          className="w-16 rounded border border-zinc-300 bg-white px-1.5 py-0.5 dark:border-zinc-700 dark:bg-zinc-900"
          aria-label={`${environment} minimum coverage`}
        />%
      </label>
      <label className="flex items-center gap-1">
        scan blocks ≤ sev
        <input
          type="number" min={1} max={5} value={sev}
          onChange={(e) => setSev(Number(e.target.value))}
          className="w-12 rounded border border-zinc-300 bg-white px-1.5 py-0.5 dark:border-zinc-700 dark:bg-zinc-900"
          aria-label={`${environment} scanner severity gate`}
        />
      </label>
      <button
        disabled={!dirty || pending}
        onClick={() =>
          startTransition(async () => setResult(await updateGates(stageBranch, { minCoverage: cov, scannerMaxSeverity: sev })))
        }
        className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
      >
        {pending ? "Requesting…" : "Request change"}
      </button>
      {result && (
        <span className={result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}>
          {result.message}{" "}
          {result.prUrl && (
            <a href={result.prUrl} target="_blank" rel="noreferrer" className="underline">
              View request
            </a>
          )}
        </span>
      )}
    </div>
  );
}
