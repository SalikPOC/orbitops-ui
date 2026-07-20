"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";
import { reviewDeployment, type ActionResult } from "@/lib/actions";
import { fmtAge } from "@/lib/attention";
import { fmtStage } from "@/lib/format";
import { summarizeMetadataPath } from "@/lib/metadata-summary";
import type { PendingApproval } from "@/lib/data";

const statusDot: Record<string, string> = {
  added: "text-emerald-500",
  removed: "text-red-500",
  modified: "text-blue-500",
};

export function ApprovalCard({ approval, isReleaseManager }: {
  approval: PendingApproval;
  isReleaseManager: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const [comment, setComment] = useState("");
  const router = useRouter();

  const review = (state: "approved" | "rejected") =>
    startTransition(async () => {
      const r = await reviewDeployment(approval.runId, state, comment.trim());
      setResult(r);
      if (r.ok) setTimeout(() => router.refresh(), 2500);
    });

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-900/20">
      <div className="flex flex-wrap items-center gap-2 text-sm text-amber-900 dark:text-amber-200">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-500" />
        <span className="font-semibold">{fmtStage(approval.environment)}</span>
        <span>{copy.approvals.waiting(fmtAge(approval.startedAt))}</span>
        <a href={approval.runUrl} target="_blank" rel="noreferrer" className="ml-auto shrink-0 text-xs underline">
          {copy.approvals.viewProgress} ↗
        </a>
      </div>
      <div className="mt-1 text-sm font-medium">
        {copy.approvals.releaseTitle(fmtStage(approval.environment), approval.title)}
      </div>

      {approval.files.length > 0 && (
        <details className="mt-2" open={approval.files.length <= 6}>
          <summary className="cursor-pointer text-xs font-medium text-amber-800 dark:text-amber-300">
            {copy.approvals.whatWillDeploy(approval.files.length)}
          </summary>
          <ul className="mt-1 space-y-0.5 text-sm">
            {approval.files.map((f) => (
              <li key={f.filename}>
                <span className={`mr-1 ${statusDot[f.status] ?? "text-zinc-400"}`}>●</span>
                {summarizeMetadataPath(f.filename, f.status)}
              </li>
            ))}
          </ul>
        </details>
      )}

      {isReleaseManager ? (
        approval.canApprove ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={copy.approvals.commentHint}
              className="w-56 rounded-lg border border-amber-300 bg-white px-2 py-1.5 text-xs dark:border-amber-800 dark:bg-zinc-900"
            />
            <button
              onClick={() => review("approved")}
              disabled={pending}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {pending ? "…" : copy.approvals.approve}
            </button>
            <button
              onClick={() => review("rejected")}
              disabled={pending}
              className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              {copy.approvals.reject}
            </button>
          </div>
        ) : (
          <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">{copy.approvals.appNotReviewer}</p>
        )
      ) : (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">{copy.approvals.managerOnly}</p>
      )}
      {result && (
        <p className={`mt-2 text-sm font-medium ${result.ok ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
