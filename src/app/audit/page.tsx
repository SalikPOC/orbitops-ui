import { copy } from "@/lib/copy";
import { getDeployHistory, getPipeline } from "@/lib/data";
import { computeMetrics } from "@/lib/metrics";
import { AuditLog } from "@/components/AuditLog";

export const dynamic = "force-dynamic";

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="text-2xl font-semibold tracking-tight">{value}</div>
      <div className="text-xs text-zinc-500">{label}</div>
    </div>
  );
}

export default async function AuditPage() {
  const stages = await getPipeline();
  const histories = await Promise.all(stages.map((s) => getDeployHistory(s.environment)));
  const events = histories.flat().sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
  const m = computeMetrics(events);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{copy.audit.title}</h1>
      <div className="mb-6 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Releases" value={String(m.releases)} />
        <Tile label="Back outs" value={String(m.rollbacks)} />
        <Tile label="Activity this week" value={String(m.last7Days)} />
        <Tile label="Back-out rate" value={`${m.changeFailureRate}%`} />
      </div>
      <AuditLog events={events} />
    </div>
  );
}
