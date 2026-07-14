"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitForPromotion, type ActionResult } from "@/lib/actions";
import { copy } from "@/lib/copy";

export function SubmitForPromotion({ headBranch, baseBranch, defaultTitle, disabled }: {
  headBranch: string;
  baseBranch: string;
  defaultTitle: string;
  disabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<(ActionResult & { prNumber?: number }) | null>(null);
  const [title, setTitle] = useState(defaultTitle);
  const router = useRouter();

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        {copy.submit.title}
      </h2>
      <p className="mb-3 text-sm text-zinc-500">{disabled ? copy.submit.needChanges : copy.submit.ready}</p>
      <div className="flex gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={disabled || pending}
          className="w-full max-w-sm rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
          aria-label="Change title"
        />
        <button
          disabled={disabled || pending || !title.trim()}
          onClick={() =>
            startTransition(async () => {
              const r = await submitForPromotion(headBranch, baseBranch, title.trim());
              setResult(r);
              if (r.ok && r.prNumber) setTimeout(() => router.push(`/promotions/${r.prNumber}`), 1200);
            })
          }
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
        >
          {pending ? "Submitting…" : copy.submit.button}
        </button>
      </div>
      {result && (
        <p className={`mt-2 text-sm ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
