import { copy } from "@/lib/copy";
import { fmtDateTime } from "@/lib/format";
import { getDeployHistory, getPipeline } from "@/lib/data";
import { AutoRefresh } from "@/components/AutoRefresh";
import { WorkItemBadge } from "@/components/chips";

export const dynamic = "force-dynamic";

export default async function DeploymentsPage() {
  const stages = await getPipeline();
  const histories = await Promise.all(stages.map((s) => getDeployHistory(s.environment)));

  return (
    <div>
      <AutoRefresh seconds={60} />
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{copy.deployments.title}</h1>
      <div className="space-y-8">
        {stages.map((stage, i) => (
          <section key={stage.environment}>
            <h2 className="mb-3 text-base font-semibold capitalize">{stage.environment}</h2>
            {histories[i].length === 0 ? (
              <p className="text-sm text-zinc-500">{copy.pipeline.noDeploysYet}</p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                <table className="w-full bg-white text-sm dark:bg-zinc-900">
                  <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/60">
                    <tr>
                      <th className="px-4 py-2">#</th>
                      <th className="px-4 py-2">What happened</th>
                      <th className="px-4 py-2">Work items</th>
                      <th className="px-4 py-2">Contents</th>
                      <th className="px-4 py-2">When / who</th>
                      <th className="px-4 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {histories[i].map((m) => (
                      <tr key={m.seq}>
                        <td className="px-4 py-2 font-semibold">{m.seq}</td>
                        <td className="px-4 py-2">
                          {m.type === "rollback" ? (
                            <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs font-medium text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                              {copy.deployments.backedOut} → #{m.rolledBackTo}
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                              {copy.deployments.released}
                            </span>
                          )}
                          {m.reason && <div className="mt-1 text-xs text-zinc-500">{m.reason}</div>}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex flex-wrap gap-1">
                            {m.workItems.length ? (
                              m.workItems.map((w) => <WorkItemBadge key={w} id={w} />)
                            ) : (
                              <span className="text-xs text-zinc-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-500">
                          {copy.deployments.components(m.componentCount)}
                          {m.destructiveCount > 0 && (
                            <span className="ml-1 text-red-600 dark:text-red-400">
                              · {m.destructiveCount} removed
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-zinc-500">
                          {fmtDateTime(m.timestamp)}
                          <br />
                          {copy.deployments.by} {m.actor}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <a
                            href={m.runUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                          >
                            {copy.deployments.viewDetails}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
