import { copy } from "@/lib/copy";
import { getDeployHistory, getPipeline } from "@/lib/data";
import { getSessionUser } from "@/auth";
import { AutoRefresh } from "@/components/AutoRefresh";
import { WorkItemBadge } from "@/components/chips";
import { RollbackTimeline } from "@/components/RollbackTimeline";

export const dynamic = "force-dynamic";

export default async function RollbackPage({
  searchParams,
}: {
  searchParams: Promise<{ env?: string }>;
}) {
  const [{ env: envParam }, stages, user] = await Promise.all([
    searchParams,
    getPipeline(),
    getSessionUser(),
  ]);
  const env = stages.some((s) => s.environment === envParam)
    ? (envParam as string)
    : stages[0]?.environment ?? "integration";
  const history = await getDeployHistory(env);
  const isReleaseManager = user?.role === "release-manager" || user?.role === "admin";

  return (
    <div className="max-w-3xl">
      <AutoRefresh seconds={60} />
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">{copy.rollback.title}</h1>
      <p className="mb-3 max-w-xl text-sm text-zinc-500">{copy.rollback.intro}</p>
      <p className="mb-6 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
        {copy.rollback.metadataOnly}
      </p>

      <div className="mb-6 flex gap-2">
        {stages.map((s) => (
          <a
            key={s.environment}
            href={`/rollback?env=${s.environment}`}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize ${
              s.environment === env
                ? "bg-indigo-600 text-white"
                : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-50 dark:bg-zinc-900 dark:text-zinc-300 dark:ring-zinc-800"
            }`}
          >
            {s.environment}
          </a>
        ))}
      </div>

      {history.length === 0 ? (
        <p className="text-sm text-zinc-500">{copy.pipeline.noDeploysYet}</p>
      ) : (
        <RollbackTimeline env={env} history={history} isReleaseManager={isReleaseManager} />
      )}

      {history.length > 0 && (
        <div className="mt-8 text-xs text-zinc-400">
          {copy.deployments.by} the numbers:{" "}
          {history
            .flatMap((m) => m.workItems)
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((w) => (
              <span key={w} className="mr-1 inline-block align-middle">
                <WorkItemBadge id={w} />
              </span>
            ))}
        </div>
      )}
    </div>
  );
}
