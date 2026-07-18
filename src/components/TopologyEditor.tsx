"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";
import { fmtStage } from "@/lib/format";
import { addStage, removeStage, type NewStageInput, type TopologyResult } from "@/lib/actions";

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900";

interface StageRow {
  branch: string;
  environment: string;
  org: string;
}

function ResultNote({ result }: { result: TopologyResult }) {
  return (
    <div
      className={`mt-3 rounded-xl border p-3 text-sm ${
        result.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400"
      }`}
    >
      <p>
        {result.message}{" "}
        {result.prUrl && (
          <a href={result.prUrl} target="_blank" rel="noreferrer" className="font-semibold underline">
            {copy.topology.viewRequest} ↗
          </a>
        )}
      </p>
      {result.ok && result.manualSteps && result.manualSteps.length > 0 && (
        <div className="mt-2">
          <p className="font-semibold">{copy.topology.manualStepsTitle}</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {result.manualSteps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function TopologyEditor({ stages, canEdit }: { stages: StageRow[]; canEdit: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<TopologyResult | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [branch, setBranch] = useState("");
  const [org, setOrg] = useState("");
  const [after, setAfter] = useState(stages[stages.length - 1]?.branch ?? "");
  const [auth, setAuth] = useState<NewStageInput["authMethod"]>("sfdx-url");
  const [tests, setTests] = useState<NewStageInput["testLevel"]>("RunLocalTests");
  const [cov, setCov] = useState(75);
  const [sev, setSev] = useState(2);
  const [approval, setApproval] = useState(true);
  const router = useRouter();

  const run = (fn: () => Promise<TopologyResult>) =>
    startTransition(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) {
        setConfirmRemove(null);
        setShowAdd(false);
        setTimeout(() => router.refresh(), 3000);
      }
    });

  const submitAdd = () =>
    run(() =>
      addStage({
        environment: name,
        branch: branch || name,
        org,
        authMethod: auth,
        testLevel: tests,
        afterBranch: after,
        minCoverage: cov,
        scannerMaxSeverity: sev,
        requiredReviewers: approval,
      })
    );

  return (
    <section className="mb-8 max-w-2xl">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">{copy.topology.title}</h2>
        {canEdit && (
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            {copy.topology.addButton}
          </button>
        )}
      </div>
      <p className="mb-3 text-sm text-zinc-500">{copy.topology.intro}</p>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
        <span className="rounded-lg border border-dashed border-zinc-300 px-2.5 py-1.5 text-sm text-zinc-500 dark:border-zinc-700">
          {copy.pipeline.devColumn}
        </span>
        {stages.map((s) => (
          <span key={s.branch} className="flex items-center gap-2">
            <span aria-hidden className="text-zinc-300 dark:text-zinc-600">→</span>
            <span className="inline-flex items-center gap-2 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-sm font-medium dark:bg-zinc-800">
              {fmtStage(s.environment)}
              <span className="text-[11px] font-normal text-zinc-400">{s.org}</span>
              {canEdit && stages.length > 1 && (
                <button
                  onClick={() => { setResult(null); setConfirmRemove(s.branch); }}
                  disabled={pending}
                  className="text-[11px] font-semibold text-red-600 hover:underline dark:text-red-400"
                >
                  {copy.topology.removeButton}
                </button>
              )}
            </span>
          </span>
        ))}
      </div>

      {confirmRemove && (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-200">
          <p>{copy.topology.removeConfirm(fmtStage(stages.find((s) => s.branch === confirmRemove)?.environment ?? confirmRemove))}</p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => run(() => removeStage(confirmRemove))}
              disabled={pending}
              className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            >
              {pending ? "…" : copy.topology.confirmRemove}
            </button>
            <button
              onClick={() => setConfirmRemove(null)}
              disabled={pending}
              className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
            >
              {copy.topology.cancel}
            </button>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="mt-3 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <h3 className="text-sm font-semibold">{copy.topology.addTitle}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium">{copy.topology.nameLabel}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="sit" className={inputCls} />
              <p className="mt-1 text-[11px] text-zinc-500">{copy.topology.nameHint}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">{copy.topology.branchLabel}</label>
              <input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder={name || "sit"} className={inputCls} />
              <p className="mt-1 text-[11px] text-zinc-500">{copy.topology.branchHint}</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">{copy.topology.orgLabel}</label>
              <input value={org} onChange={(e) => setOrg(e.target.value.toUpperCase())} placeholder="SIT" className={inputCls} />
              <p className="mt-1 text-[11px] text-zinc-500">{copy.topology.orgHint}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium">{copy.topology.positionLabel}</label>
              <select value={after} onChange={(e) => setAfter(e.target.value)} className={inputCls}>
                <option value="">{copy.topology.positionFirst}</option>
                {stages.map((s) => (
                  <option key={s.branch} value={s.branch}>
                    {copy.topology.positionAfter(fmtStage(s.environment))}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">{copy.topology.authLabel}</label>
              <select value={auth} onChange={(e) => setAuth(e.target.value as NewStageInput["authMethod"])} className={inputCls}>
                <option value="sfdx-url">{copy.topology.authSfdxUrl}</option>
                <option value="jwt">{copy.topology.authJwt}</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium">{copy.topology.testLabel}</label>
              <select value={tests} onChange={(e) => setTests(e.target.value as NewStageInput["testLevel"])} className={inputCls}>
                <option value="RunLocalTests">{copy.topology.testLocal}</option>
                <option value="Conditional">{copy.topology.testConditional}</option>
                <option value="NoTestRun">{copy.topology.testNone}</option>
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-1">
              coverage ≥
              <input
                type="number" min={0} max={100} value={cov}
                onChange={(e) => setCov(Number(e.target.value))}
                className="w-16 rounded border border-zinc-300 bg-white px-1.5 py-0.5 dark:border-zinc-700 dark:bg-zinc-900"
              />%
            </label>
            <label className="flex items-center gap-1">
              scan blocks ≤ sev
              <input
                type="number" min={1} max={5} value={sev}
                onChange={(e) => setSev(Number(e.target.value))}
                className="w-12 rounded border border-zinc-300 bg-white px-1.5 py-0.5 dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={approval} onChange={(e) => setApproval(e.target.checked)} />
              {copy.topology.approvalLabel}
            </label>
          </div>
          <button
            onClick={submitAdd}
            disabled={pending || !name.trim() || !org.trim()}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
          >
            {pending ? "Requesting…" : copy.topology.submit}
          </button>
        </div>
      )}

      {result && <ResultNote result={result} />}
    </section>
  );
}
