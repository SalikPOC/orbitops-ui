import type { CheckChip } from "@/lib/types";

const chipStyles: Record<CheckChip["status"], string> = {
  success: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  failure: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  pending: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 animate-pulse",
  skipped: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  neutral: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};

const chipIcon: Record<CheckChip["status"], string> = {
  success: "✓",
  failure: "✕",
  pending: "●",
  skipped: "–",
  neutral: "–",
};

export function Chip({ chip }: { chip: CheckChip }) {
  const inner = (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${chipStyles[chip.status]}`}
    >
      {chipIcon[chip.status]} {chip.name}
    </span>
  );
  return chip.url ? (
    <a href={chip.url} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    inner
  );
}

export function WorkItemBadge({ id }: { id: string }) {
  return (
    <span className="inline-block rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
      {id}
    </span>
  );
}
