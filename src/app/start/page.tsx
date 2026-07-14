import { copy } from "@/lib/copy";
import { getPipeline } from "@/lib/data";
import { StartChangeForm } from "@/components/StartChangeForm";

export const dynamic = "force-dynamic";

export default async function StartChangePage() {
  const stages = await getPipeline();
  return (
    <div className="max-w-lg">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">{copy.startChange.title}</h1>
      <p className="mb-6 text-sm text-zinc-500">{copy.startChange.intro}</p>
      <StartChangeForm stages={stages.map((s) => ({ branch: s.branch, environment: s.environment }))} />
    </div>
  );
}
