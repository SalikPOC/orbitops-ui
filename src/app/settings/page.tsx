import Link from "next/link";
import { copy } from "@/lib/copy";
import { fmtStage } from "@/lib/format";
import { getConnectedOrgEntries, getPipeline, getSourceOrgs } from "@/lib/data";
import { getSessionUser } from "@/auth";
import { GateEditor } from "@/components/GateEditor";
import { ConnectedOrgsList } from "@/components/ConnectedOrgsList";
import { TopologyEditor } from "@/components/TopologyEditor";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const [{ connected }, stages, sourceOrgs, connectedOrgs, user] = await Promise.all([
    searchParams,
    getPipeline(),
    getSourceOrgs(),
    getConnectedOrgEntries(),
    getSessionUser(),
  ]);
  const canEdit = user?.role === "release-manager" || user?.role === "admin";
  const configuredDevOrgs = sourceOrgs.filter((o) => !connectedOrgs.some((c) => c.org === o.key));
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{copy.settings.title}</h1>
      {connected && (
        <p className="mb-4 max-w-2xl rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-400">
          {copy.connectOrg.connected}
        </p>
      )}
      <section className="mb-8 max-w-2xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold">{copy.connectOrg.listTitle}</h2>
          <Link
            href="/connect-org"
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            {copy.connectOrg.button}
          </Link>
        </div>
        <ConnectedOrgsList orgs={connectedOrgs} />
        {configuredDevOrgs.length > 0 && (
          <ul className="mt-2 divide-y divide-zinc-100 overflow-hidden rounded-xl border border-dashed border-zinc-200 bg-white text-sm text-zinc-500 dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {configuredDevOrgs.map((o) => (
              <li key={o.key} className="flex items-center justify-between px-4 py-2">
                <span>{o.label}</span>
                <span className="text-xs text-zinc-400">{o.key} · configured in pipeline.yml</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <TopologyEditor
        stages={stages.map((s) => ({ branch: s.branch, environment: s.environment, org: s.org }))}
        canEdit={canEdit}
      />
      <div className="max-w-2xl overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full bg-white text-sm dark:bg-zinc-900">
          <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/60">
            <tr>
              <th className="px-4 py-2">Stage</th>
              <th className="px-4 py-2" colSpan={2}>Quality gates</th>
              <th className="px-4 py-2">Approval</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {stages.map((s) => (
              <tr key={s.environment}>
                <td className="px-4 py-2 font-medium">{fmtStage(s.environment)}</td>
                <td className="px-4 py-2" colSpan={2}>
                  <GateEditor
                    stageBranch={s.branch}
                    environment={s.environment}
                    minCoverage={s.gates.minCoverage}
                    scannerMaxSeverity={s.gates.scannerMaxSeverity}
                    canEdit={canEdit}
                  />
                </td>
                <td className="px-4 py-2">{s.gates.requiredReviewers ? "Release manager" : "None"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-zinc-400">
        Gate changes open a review (a config change request) — they take effect once approved and merged.
        Approval requirements are managed in GitHub environment settings.
      </p>
    </div>
  );
}
