import { notFound } from "next/navigation";
import { copy } from "@/lib/copy";
import { getPipeline, getPromotionFiles } from "@/lib/data";
import { summarizeMetadataPath } from "@/lib/metadata-summary";
import { AutoRefresh } from "@/components/AutoRefresh";
import { WorkItemBadge } from "@/components/chips";
import { ChangesPanel } from "@/components/ChangesPanel";
import { SubmitForPromotion } from "@/components/SubmitForPromotion";

export const dynamic = "force-dynamic";

export default async function ChangePage({ params }: { params: Promise<{ branch: string[] }> }) {
  const { branch } = await params;
  const headBranch = branch.map(decodeURIComponent).join("/");
  if (!headBranch.startsWith("feature/")) notFound();

  const stages = await getPipeline();
  const baseBranch = stages[0]?.branch ?? "integration"; // changes are built against the first stage
  const stage = stages[0];
  const files = await getPromotionFiles(baseBranch, headBranch);

  const workItems = [...new Set(headBranch.match(/[A-Z][A-Z0-9]+-\d+|AB#\d+/g) ?? [])];
  const slug = headBranch
    .replace(/^feature\//, "")
    .replace(/^([A-Z][A-Z0-9]+-\d+|AB#\d+)-?/, "")
    .replace(/-/g, " ")
    .trim();
  const title = slug ? slug[0].toUpperCase() + slug.slice(1) : headBranch;

  return (
    <div className="max-w-3xl">
      <AutoRefresh seconds={20} />
      <div className="mb-1 flex items-center gap-2">
        {workItems.map((w) => (
          <WorkItemBadge key={w} id={w} />
        ))}
        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800">
          {copy.changes.inProgress}
        </span>
      </div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>

      <ChangesPanel
        files={files.map((f) => ({ ...f, summary: summarizeMetadataPath(f.filename, f.status) }))}
        headBranch={headBranch}
        baseBranch={baseBranch}
        sourceEnv={stage?.environment ?? "integration"}
        prNumber={0}
        conflicted={false}
      />

      <SubmitForPromotion
        headBranch={headBranch}
        baseBranch={baseBranch}
        defaultTitle={title}
        disabled={files.length === 0}
      />
    </div>
  );
}
