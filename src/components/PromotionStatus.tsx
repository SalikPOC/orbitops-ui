"use client";
import { createContext, useContext, useState } from "react";
import { copy } from "@/lib/copy";
import type { ActionResult } from "@/lib/actions";

/**
 * Shared promote status so the outcome shows near the top of the promotion
 * page, not just next to the button below the fold. PromoteButton (bottom)
 * writes; PromotionTopBanner (top) reads.
 */
type Status = { phase: "idle" } | { phase: "pending" } | { phase: "done"; result: ActionResult };

const Ctx = createContext<{ status: Status; setStatus: (s: Status) => void } | null>(null);

export function PromotionStatusProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>({ phase: "idle" });
  return <Ctx.Provider value={{ status, setStatus }}>{children}</Ctx.Provider>;
}

export function usePromotionStatus() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePromotionStatus must be used within PromotionStatusProvider");
  return ctx;
}

export function PromotionTopBanner() {
  const { status, setStatus } = usePromotionStatus();
  if (status.phase === "idle") return null;

  if (status.phase === "pending") {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-medium text-indigo-800 dark:border-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-300">
        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
          <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
        </svg>
        {copy.promoteStatus.promoting}
      </div>
    );
  }

  const { result } = status;
  return (
    <div
      className={`mb-6 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium ${
        result.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-300"
          : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-300"
      }`}
    >
      <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${result.ok ? "bg-emerald-500" : "bg-red-500"}`} />
      <span>{result.message}</span>
      {!result.ok && (
        <button
          onClick={() => setStatus({ phase: "idle" })}
          className="ml-auto shrink-0 text-xs font-semibold underline"
        >
          {copy.promoteStatus.dismiss}
        </button>
      )}
    </div>
  );
}
