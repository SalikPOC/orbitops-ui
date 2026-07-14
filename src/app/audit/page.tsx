import { copy } from "@/lib/copy";
import { getDeployHistory, getPipeline } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  const stages = await getPipeline();
  const histories = await Promise.all(stages.map((s) => getDeployHistory(s.environment)));
  const events = histories
    .flat()
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{copy.audit.title}</h1>
      <ol className="max-w-2xl space-y-2">
        {events.map((m) => (
          <li
            key={`${m.env}-${m.seq}`}
            className="rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="font-medium">{m.actor}</span>{" "}
            {m.type === "rollback" ? `backed out ${m.env} to release #${m.rolledBackTo}` : `released #${m.seq} to ${m.env}`}
            <span className="ml-2 text-xs text-zinc-400">{new Date(m.timestamp).toLocaleString()}</span>
            {m.reason && <div className="mt-1 text-xs text-zinc-500">Reason: {m.reason}</div>}
            <a
              href={m.runUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {copy.deployments.viewDetails}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}
