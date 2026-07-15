"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";
import { startChange, type ActionResult } from "@/lib/actions";

const inputCls =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900";

export function StartChangeForm({ stages }: { stages: { branch: string; environment: string }[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  // Controlled inputs: React 19 resets uncontrolled forms after every action,
  // which wiped what the user typed whenever validation failed.
  const [workItem, setWorkItem] = useState("");
  const [description, setDescription] = useState("");
  const router = useRouter();

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          const r = await startChange(fd);
          setResult(r);
          if (r.ok && r.branch) setTimeout(() => router.push(`/changes/${r.branch}`), 800);
        })
      }
      className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div>
        <label className="mb-1 block text-sm font-medium">{copy.startChange.workItemLabel}</label>
        <input
          name="workItem"
          value={workItem}
          onChange={(e) => setWorkItem(e.target.value)}
          placeholder="PROJ-123"
          className={inputCls}
          required
        />
        <p className="mt-1 text-xs text-zinc-500">{copy.startChange.workItemHint}</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{copy.startChange.descriptionLabel}</label>
        <input
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add discount tracking to Clinic"
          className={inputCls}
          required
        />
        <p className="mt-1 text-xs text-zinc-500">{copy.startChange.descriptionHint}</p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">{copy.startChange.stageLabel}</label>
        <select name="sourceBranch" className={inputCls} defaultValue="integration">
          {stages.map((s) => (
            <option key={s.branch} value={s.branch} className="capitalize">
              {s.environment}
            </option>
          ))}
        </select>
      </div>
      <button
        disabled={pending}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
      >
        {pending ? "Creating…" : copy.startChange.submit}
      </button>
      {result && (
        <p className={`text-sm ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {result.message}
        </p>
      )}
    </form>
  );
}
