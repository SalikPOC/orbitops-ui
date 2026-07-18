import Link from "next/link";
import { copy } from "@/lib/copy";
import { fmtDateTime, fmtStage } from "@/lib/format";
import { getWorkItemBoard, type WorkItemSummary } from "@/lib/workitems";
import { getTrackerInfo } from "@/lib/tracker";
import { AutoRefresh } from "@/components/AutoRefresh";
import { WorkItemBadge } from "@/components/chips";

export const dynamic = "force-dynamic";

const statePill: Record<WorkItemSummary["state"], string> = {
  building: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  checks: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  attention: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  conflict: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  ready: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300",
  released: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
};

/** ✓ INT ✓ UAT ○ PROD — where this work item has been released. */
function EnvProgress({ item }: { item: WorkItemSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" title={copy.myChanges.envLegend}>
      {item.envs.map((e) => (
        <span
          key={e.environment}
          title={
            e.released
              ? `Released to ${fmtStage(e.environment)} (release #${e.seq}, ${fmtDateTime(e.timestamp!)})`
              : `Not released to ${fmtStage(e.environment)} yet`
          }
          className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium ${
            e.released
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
              : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500"
          }`}
        >
          {e.released ? "✓" : "○"} {fmtStage(e.environment)}
        </span>
      ))}
    </div>
  );
}

function actionLabel(item: WorkItemSummary): string {
  const a = copy.myChanges.action;
  if (item.state === "ready") return a.ready(fmtStage(item.targetEnv ?? ""));
  return a[item.state];
}

function WorkItemCard({ item, tracker }: {
  item: WorkItemSummary;
  tracker: { url?: string; status?: string };
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <WorkItemBadge id={item.id} href={tracker.url} status={tracker.status} />
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statePill[item.state]}`}>
          {copy.myChanges.state[item.state]}
          {item.state !== "released" && item.targetEnv ? ` · to ${fmtStage(item.targetEnv)}` : ""}
        </span>
      </div>
      <div className="mb-2 text-sm font-medium leading-snug">{item.title}</div>
      <EnvProgress item={item} />
      <Link
        href={item.href}
        className="mt-3 inline-block rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
      >
        {actionLabel(item)}
      </Link>
    </div>
  );
}

export default async function MyChangesPage() {
  const [{ items }] = await Promise.all([getWorkItemBoard()]);
  const tracker = await getTrackerInfo(items.map((i) => i.id));

  const columns: { key: keyof typeof copy.myChanges.columns; states: WorkItemSummary["state"][] }[] = [
    { key: "building", states: ["building"] },
    { key: "inFlight", states: ["checks", "attention", "conflict"] },
    { key: "ready", states: ["ready"] },
    { key: "released", states: ["released"] },
  ];

  return (
    <div>
      <AutoRefresh seconds={30} />
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{copy.myChanges.title}</h1>
        <Link
          href="/start"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
        >
          {copy.startChange.button}
        </Link>
      </div>
      <p className="mb-6 text-sm text-zinc-500">{copy.myChanges.intro}</p>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">{copy.myChanges.none}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => {
            const colItems = items.filter((i) => col.states.includes(i.state));
            return (
              <section
                key={col.key}
                className="rounded-2xl border border-zinc-200 bg-zinc-100/50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50"
              >
                <h2 className="mb-2 px-1 text-xs font-medium uppercase tracking-wide text-zinc-400">
                  {copy.myChanges.columns[col.key]} · {colItems.length}
                </h2>
                <div className="space-y-2">
                  {colItems.length ? (
                    colItems.map((item) => (
                      <WorkItemCard key={item.id} item={item} tracker={tracker[item.id] ?? {}} />
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-zinc-300 p-3 text-center text-xs text-zinc-400 dark:border-zinc-700">
                      —
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
