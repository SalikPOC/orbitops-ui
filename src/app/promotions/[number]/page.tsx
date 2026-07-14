import { notFound } from "next/navigation";
import { marked } from "marked";
import { copy } from "@/lib/copy";
import { getPipeline, getPromotion, getPromotionFiles, getStickyComment } from "@/lib/data";
import { summarizeMetadataPath } from "@/lib/metadata-summary";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Chip, WorkItemBadge } from "@/components/chips";
import { PromoteButton } from "@/components/PromoteButton";
import { ChangesPanel } from "@/components/ChangesPanel";

export const dynamic = "force-dynamic";

export default async function PromotionPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const prNumber = Number(number);
  const [promotion, stages] = await Promise.all([getPromotion(prNumber), getPipeline()]);
  if (!promotion) notFound();

  const stage = stages.find((s) => s.branch === promotion.baseBranch);
  const [preview, files] = await Promise.all([
    getStickyComment(prNumber, "orbitops:deploy-preview"),
    getPromotionFiles(promotion.baseBranch, promotion.headBranch),
  ]);
  const failing = promotion.checks.some((c) => c.status === "failure");
  const running = promotion.checks.some((c) => c.status === "pending");
  const blocked = failing || running || promotion.mergeable === false;

  return (
    <div className="max-w-3xl">
      <AutoRefresh seconds={20} />
      <div className="mb-1 flex items-center gap-2">
        {promotion.workItems.map((w) => (
          <WorkItemBadge key={w} id={w} />
        ))}
        <span className="text-xs text-zinc-400">#{promotion.number}</span>
      </div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">{promotion.title}</h1>
      <p className="mb-6 text-sm text-zinc-500">
        by {promotion.author} → <span className="capitalize">{stage?.environment ?? promotion.baseBranch}</span>
      </p>

      <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">Checks</h2>
        <div className="flex flex-wrap gap-1.5">
          {promotion.checks.map((c) => (
            <Chip key={c.name} chip={c} />
          ))}
        </div>
        {promotion.mergeable === false && (
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">{copy.pipeline.conflict}</p>
        )}
      </section>

      <ChangesPanel
        files={files.map((f) => ({ ...f, summary: summarizeMetadataPath(f.filename, f.status) }))}
        headBranch={promotion.headBranch}
        baseBranch={promotion.baseBranch}
        sourceEnv={stage?.environment ?? "integration"}
        prNumber={promotion.number}
        conflicted={promotion.mergeable === false}
      />

      {preview && (
        <section className="prose prose-sm prose-zinc mb-6 max-w-none rounded-2xl border border-zinc-200 bg-white p-4 dark:prose-invert dark:border-zinc-800 dark:bg-zinc-900 [&_h2]:mt-0">
          {/* Markdown authored by our own pipeline workflows (trusted source) */}
          <div dangerouslySetInnerHTML={{ __html: marked.parse(preview.replace(/<!--.*?-->/g, "")) as string }} />
        </section>
      )}

      <PromoteButton
        prNumber={promotion.number}
        label={copy.pipeline.promote(stage?.environment ?? promotion.baseBranch)}
        disabled={blocked}
        disabledReason={
          failing
            ? copy.pipeline.checksFailing
            : running
              ? copy.pipeline.checksRunning
              : promotion.mergeable === false
                ? copy.pipeline.conflict
                : undefined
        }
      />
      {stage?.gates.requiredReviewers && (
        <p className="mt-3 text-xs text-zinc-500">
          After promoting, a release manager approves the deployment before it reaches the org.
        </p>
      )}
    </div>
  );
}
