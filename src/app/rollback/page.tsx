import { copy } from "@/lib/copy";

export default function RollbackPage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">{copy.rollback.title}</h1>
      <p className="mb-4 max-w-xl text-sm text-zinc-500">{copy.rollback.intro}</p>
      <p className="mb-6 max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-900/20 dark:text-amber-300">
        {copy.rollback.metadataOnly}
      </p>
      <p className="text-sm text-zinc-400">{copy.rollback.comingSoon}</p>
    </div>
  );
}
