import Link from "next/link";
import { copy } from "@/lib/copy";
import { getPipeline, getSourceOrgs } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string }>;
}) {
  const [{ connected }, stages, sourceOrgs] = await Promise.all([
    searchParams,
    getPipeline(),
    getSourceOrgs(),
  ]);
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
        {sourceOrgs.length === 0 ? (
          <p className="text-sm text-zinc-500">{copy.connectOrg.none}</p>
        ) : (
          <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white text-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {sourceOrgs.map((o) => (
              <li key={o.key} className="flex items-center justify-between px-4 py-2">
                <span>{o.label}</span>
                <span className="text-xs text-zinc-400">{o.key}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <div className="max-w-2xl overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full bg-white text-sm dark:bg-zinc-900">
          <thead className="bg-zinc-100 text-left text-xs uppercase tracking-wide text-zinc-500 dark:bg-zinc-800/60">
            <tr>
              <th className="px-4 py-2">Stage</th>
              <th className="px-4 py-2">Scan blocks at</th>
              <th className="px-4 py-2">Min coverage</th>
              <th className="px-4 py-2">Approval</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {stages.map((s) => (
              <tr key={s.environment}>
                <td className="px-4 py-2 font-medium capitalize">{s.environment}</td>
                <td className="px-4 py-2">severity ≤ {s.gates.scannerMaxSeverity}</td>
                <td className="px-4 py-2">{s.gates.minCoverage}%</td>
                <td className="px-4 py-2">{s.gates.requiredReviewers ? "Release manager" : "None"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-zinc-400">Editing gates from here arrives in a later step (changes go through review).</p>
    </div>
  );
}
