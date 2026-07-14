import { copy } from "@/lib/copy";
import { getPipeline } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const stages = await getPipeline();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{copy.settings.title}</h1>
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
