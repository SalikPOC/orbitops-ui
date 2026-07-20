import type { CheckChip } from "@/lib/types";
import { copy } from "@/lib/copy";

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

export function Chip({ chip, link = true }: { chip: CheckChip; link?: boolean }) {
  // CI check names are engineer-speak ("Resolve stage") — show the citizen
  // label and keep the explanation one hover away.
  const friendly = copy.checkLabels[chip.name];
  const inner = (
    <span
      title={friendly?.hint ?? chip.name}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${chipStyles[chip.status]}`}
    >
      {chipIcon[chip.status]} {friendly?.label ?? chip.name}
    </span>
  );
  // link={false} when the chip sits inside another link (e.g. a promotion
  // card) — HTML forbids nested <a> and React flags it as a hydration error.
  return link && chip.url ? (
    <a href={chip.url} target="_blank" rel="noreferrer">
      {inner}
    </a>
  ) : (
    inner
  );
}

export function WorkItemBadge({ id, href, status }: { id: string; href?: string; status?: string }) {
  const inner = (
    <span className="inline-flex items-center gap-1 rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
      {id}
      {status && (
        <span className="rounded-sm bg-indigo-200/70 px-1 font-medium text-indigo-900 dark:bg-indigo-800/60 dark:text-indigo-200">
          {status}
        </span>
      )}
      {href && <span aria-hidden>↗</span>}
    </span>
  );
  return href ? (
    <a href={href} target="_blank" rel="noreferrer" title={`Open ${id} in your tracker`} className="hover:opacity-80">
      {inner}
    </a>
  ) : (
    inner
  );
}
