"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { promote } from "@/lib/actions";
import { usePromotionStatus } from "./PromotionStatus";

export function PromoteButton({ prNumber, label, disabled, disabledReason }: {
  prNumber: number;
  label: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [pending, startTransition] = useTransition();
  const { status, setStatus } = usePromotionStatus();
  const router = useRouter();
  const result = status.phase === "done" ? status.result : null;

  return (
    <div>
      <button
        disabled={disabled || pending}
        onClick={() =>
          startTransition(async () => {
            setStatus({ phase: "pending" });
            const r = await promote(prNumber);
            setStatus({ phase: "done", result: r });
            if (r.ok) setTimeout(() => router.push("/pipeline"), 1500);
          })
        }
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
      >
        {pending ? "Promoting…" : label}
      </button>
      {disabled && disabledReason && <p className="mt-2 text-xs text-zinc-500">{disabledReason}</p>}
      {result && (
        <p className={`mt-2 text-sm ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
