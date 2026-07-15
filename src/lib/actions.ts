"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "@/auth";
import { MOCK, REPO_OWNER, REPO_NAME } from "./env";
import { getOctokit } from "./github";
import { getPipeline, getPromotion } from "./data";
import type { Role } from "./types";

export interface ActionResult {
  ok: boolean;
  message: string;
}

const rank: Record<Role, number> = { citizen: 0, "release-manager": 1, admin: 2 };

/** Server-side gate for every mutating action (E8.4) — never trust hidden buttons. */
async function requireRole(min: Role) {
  const user = await getSessionUser();
  if (!user) throw new Error("Please sign in first.");
  if (rank[user.role] < rank[min]) throw new Error("You don't have permission to do that.");
  return user;
}

const WORK_ITEM_ONLY = /^([A-Z][A-Z0-9]+-\d+|AB#\d+)$/;

/** Merge a promotion PR (merge commit preserves Work-Items footers). */
export async function promote(prNumber: number): Promise<ActionResult> {
  try {
    const user = await requireRole("citizen");
    const promotion = await getPromotion(prNumber);
    if (!promotion) return { ok: false, message: "That change no longer exists." };

    const failing = promotion.checks.some((c) => c.status === "failure");
    const running = promotion.checks.some((c) => c.status === "pending");
    if (failing) return { ok: false, message: "Some checks need attention before promoting." };
    if (running) return { ok: false, message: "Checks are still running — try again shortly." };
    if (promotion.mergeable === false)
      return { ok: false, message: "This change conflicts with another change. A developer needs to resolve it first." };

    // Promotions beyond integration are release-manager territory (the GitHub
    // environment gate would still catch the deploy, but fail early and clearly).
    if (promotion.baseBranch !== "integration" && rank[user.role] < rank["release-manager"]) {
      return { ok: false, message: "Promotions past Integration need a release manager." };
    }

    if (MOCK) return { ok: true, message: "Promoted! (demo mode — nothing really happened)" };

    const gh = await getOctokit();
    await gh.rest.pulls.merge({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      pull_number: prNumber,
      merge_method: "merge",
    });
    // Tidy up: merged work branches otherwise linger as "being built" on the board.
    if (promotion.headBranch.startsWith("feature/")) {
      await gh.rest.git
        .deleteRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${promotion.headBranch}` })
        .catch(() => {});
    }
    revalidatePath("/pipeline");
    return { ok: true, message: "Promoted — the release is on its way." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/**
 * Update a stage's quality gates via a config PR (never a direct push — the
 * pipeline config is CODEOWNERS-reviewed). Surgical line edits preserve the
 * file's comments.
 */
export async function updateGates(
  stageBranch: string,
  gates: { minCoverage: number; scannerMaxSeverity: number }
): Promise<ActionResult & { prUrl?: string }> {
  try {
    await requireRole("release-manager");
    const { minCoverage, scannerMaxSeverity } = gates;
    if (!Number.isInteger(minCoverage) || minCoverage < 0 || minCoverage > 100)
      return { ok: false, message: "Coverage must be between 0 and 100." };
    if (!Number.isInteger(scannerMaxSeverity) || scannerMaxSeverity < 1 || scannerMaxSeverity > 5)
      return { ok: false, message: "Scan severity must be between 1 and 5." };
    if (MOCK) return { ok: true, message: "Change requested! (demo mode)", prUrl: "https://github.com" };

    const gh = await getOctokit();
    const path = ".orbitops/pipeline.yml";
    const file = await gh.rest.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path, ref: "main" });
    const raw = Buffer.from((file.data as { content: string }).content, "base64").toString("utf8");

    const lines = raw.split("\n");
    const start = lines.findIndex((l) => l.match(new RegExp(`^\\s*-\\s*branch:\\s*${stageBranch}\\s*$`)));
    if (start === -1) return { ok: false, message: "Stage not found in the pipeline config." };
    let end = lines.length;
    for (let i = start + 1; i < lines.length; i++) {
      if (/^\s*-\s*branch:/.test(lines[i])) { end = i; break; }
    }
    let touched = 0;
    for (let i = start; i < end; i++) {
      if (/^\s*scannerMaxSeverity:/.test(lines[i])) { lines[i] = lines[i].replace(/:\s*\d+/, `: ${scannerMaxSeverity}`); touched++; }
      if (/^\s*minCoverage:/.test(lines[i])) { lines[i] = lines[i].replace(/:\s*\d+/, `: ${minCoverage}`); touched++; }
    }
    if (touched < 2) return { ok: false, message: "Couldn't locate the gate settings for that stage." };
    const updated = lines.join("\n");
    if (updated === raw) return { ok: false, message: "Nothing changed." };

    const mainRef = await gh.rest.git.getRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: "heads/main" });
    const branch = `orbitops/gates-${stageBranch}-${Date.now().toString(36)}`;
    await gh.rest.git.createRef({
      owner: REPO_OWNER, repo: REPO_NAME, ref: `refs/heads/${branch}`, sha: mainRef.data.object.sha,
    });
    await gh.rest.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      branch,
      message: `Update ${stageBranch} gates: coverage ≥ ${minCoverage}%, scan blocks ≤ sev ${scannerMaxSeverity}\n\nWork-Items: POC-0`,
      content: Buffer.from(updated).toString("base64"),
      sha: (file.data as { sha: string }).sha,
    });
    const pr = await gh.rest.pulls.create({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      title: `Update ${stageBranch} stage gates (POC-0)`,
      head: branch,
      base: "main",
      body: `Requested from OrbitOps settings.\n\n- Minimum coverage: **${minCoverage}%**\n- Scan blocks at severity ≤ **${scannerMaxSeverity}**\n\nWork-Items: POC-0`,
    });
    return { ok: true, message: "Change requested — it takes effect once the review is approved.", prUrl: pr.data.html_url };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/**
 * Approve or reject a gate-held deployment from inside the app. Uses the
 * signed-in user's own GitHub token (user-to-server) — the review is recorded
 * as that person, who must be a required reviewer on the environment. (GitHub
 * Apps can't be required reviewers on personal-account repos, so the
 * installation token can't do this.)
 */
export async function reviewDeployment(
  runId: number,
  state: "approved" | "rejected",
  comment: string
): Promise<ActionResult> {
  try {
    await requireRole("release-manager");
    if (MOCK) return { ok: true, message: state === "approved" ? "Approved! Releasing…" : "Rejected." };
    const { getUserToken } = await import("@/auth");
    const token = await getUserToken();
    if (!token) return { ok: false, message: "Your GitHub session is missing — sign out and back in, then retry." };
    const { Octokit } = await import("octokit");
    const gh = new Octokit({ auth: token });
    const pending = await gh.rest.actions.getPendingDeploymentsForRun({
      owner: REPO_OWNER, repo: REPO_NAME, run_id: runId,
    });
    const envIds = pending.data.map((p) => p.environment?.id).filter((id): id is number => id !== undefined);
    if (!envIds.length) return { ok: false, message: "Nothing is waiting for approval on that release." };
    await gh.rest.actions.reviewPendingDeploymentsForRun({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      run_id: runId,
      environment_ids: envIds,
      state,
      comment: `${state === "approved" ? "Approved" : "Rejected"} via OrbitOps${comment ? ` — ${comment}` : ""}`,
    });
    return { ok: true, message: state === "approved" ? "Approved! Releasing…" : "Rejected — the release will not run." };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Something went wrong.";
    if (/401|bad credentials/i.test(msg)) {
      return { ok: false, message: "Your GitHub sign-in expired — sign out and back in, then retry." };
    }
    return {
      ok: false,
      message: /403|422|not.*(allowed|authorized)/i.test(msg)
        ? "GitHub declined the review — check you're a required reviewer on this environment and that the app's Deployments permission is 'Read and write' (accept the permission update under Settings → Installations)."
        : msg,
    };
  }
}

export interface RollbackDispatch extends ActionResult {
  runId?: number;
  runUrl?: string;
}

async function dispatchRollback(
  env: string,
  targetSeq: number,
  includeDestructive: boolean,
  mode: "preview" | "execute",
  reason: string
): Promise<RollbackDispatch> {
  if (MOCK) return { ok: true, message: "Dispatched (demo mode)", runId: 1, runUrl: "https://github.com" };
  const gh = await getOctokit();
  const since = new Date(Date.now() - 5_000).toISOString();
  await gh.rest.actions.createWorkflowDispatch({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    workflow_id: "rollback.yml",
    ref: "main",
    inputs: {
      env,
      target_seq: String(targetSeq),
      mode,
      include_destructive: includeDestructive,
      reason,
    },
  });
  // Find the run we just dispatched (dispatch API returns no id).
  const { findRecentRun } = await import("./data");
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 2_000));
    const run = await findRecentRun("rollback.yml", since);
    if (run) return { ok: true, message: "Started.", runId: run.id, runUrl: run.url };
  }
  return { ok: true, message: "Started — open the activity log if it doesn't appear shortly." };
}

/** Validate-only rollback preview: safe for any signed-in user. */
export async function startRollbackPreview(
  env: string,
  targetSeq: number,
  includeDestructive: boolean
): Promise<RollbackDispatch> {
  try {
    await requireRole("citizen");
    return await dispatchRollback(env, targetSeq, includeDestructive, "preview", "UI preview");
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Execute a rollback: release managers only, reason mandatory (audit). */
export async function executeRollback(
  env: string,
  targetSeq: number,
  includeDestructive: boolean,
  reason: string
): Promise<RollbackDispatch> {
  try {
    await requireRole("release-manager");
    if (!reason.trim()) return { ok: false, message: "A reason is required — it goes in the activity log." };
    return await dispatchRollback(env, targetSeq, includeDestructive, "execute", reason.trim());
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Poll helper for client components (server action keeps tokens server-side). */
export async function pollRollback(
  runId: number
): Promise<{ status: string; conclusion: string | null; url: string; preview: unknown | null }> {
  const { getRunStatus, getRollbackPreview } = await import("./data");
  const run = await getRunStatus(runId);
  const preview = run.status === "completed" ? await getRollbackPreview(String(runId)) : null;
  return { ...run, preview };
}

/** Create the promotion (PR) for a work branch once it has real changes in it. */
export async function submitForPromotion(
  headBranch: string,
  baseBranch: string,
  title: string
): Promise<ActionResult & { prNumber?: number }> {
  try {
    await requireRole("citizen");
    if (!headBranch.startsWith("feature/"))
      return { ok: false, message: "Only work-item changes can be submitted." };
    const workItem = headBranch.match(/[A-Z][A-Z0-9]+-\d+|AB#\d+/)?.[0];
    if (!workItem) return { ok: false, message: "This change has no work item in its name." };
    if (MOCK) return { ok: true, message: "Submitted! (demo mode)", prNumber: 42 };

    const gh = await getOctokit();
    const existing = await gh.rest.pulls.list({
      owner: REPO_OWNER, repo: REPO_NAME, state: "open", head: `${REPO_OWNER}:${headBranch}`,
    });
    if (existing.data[0]) {
      return { ok: true, message: "Already submitted.", prNumber: existing.data[0].number };
    }
    const pr = await gh.rest.pulls.create({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      title: `${title} (${workItem})`,
      head: headBranch,
      base: baseBranch,
      body: `## What does this change do?\n\n${title}\n\n## Work Items\n\nWork-Items: ${workItem}\n`,
    });
    revalidatePath("/pipeline");
    return { ok: true, message: "Submitted — checks are starting.", prNumber: pr.data.number };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Dispatch the retrieve workflow: pull the builder's org edits into their branch. */
export async function pullChanges(
  headBranch: string,
  sourceOrg: string
): Promise<ActionResult & { runId?: number; runUrl?: string }> {
  try {
    await requireRole("citizen");
    if (!headBranch.startsWith("feature/")) {
      return { ok: false, message: "Changes can only be pulled into a work-item change." };
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(sourceOrg)) return { ok: false, message: "Unknown org." };
    if (MOCK) return { ok: true, message: "Pulling your changes… (demo mode)", runId: 1, runUrl: "https://github.com" };
    const gh = await getOctokit();
    const since = new Date(Date.now() - 5_000).toISOString();
    await gh.rest.actions.createWorkflowDispatch({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      workflow_id: "retrieve.yml",
      ref: "main",
      inputs: { work_branch: headBranch, source_org: sourceOrg },
    });
    // Locate the dispatched run so the panel can show live progress.
    const { findRecentRun } = await import("./data");
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2_000));
      const run = await findRecentRun("retrieve.yml", since);
      if (run) return { ok: true, message: "Pulling your changes…", runId: run.id, runUrl: run.url };
    }
    return { ok: true, message: "Pulling your changes — check back in a minute." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Poll a workflow run's state (server action keeps tokens server-side). */
export async function getRunState(
  runId: number
): Promise<{ status: string; conclusion: string | null; url: string }> {
  const { getRunStatus } = await import("./data");
  return getRunStatus(runId);
}

/**
 * Keep/discard selection: reverts the discarded paths on the work branch back to
 * their target-stage versions (or removes them if they're new), via the git data
 * API — one commit, no force-push.
 */
export async function discardComponents(
  headBranch: string,
  baseBranch: string,
  paths: string[]
): Promise<ActionResult> {
  try {
    await requireRole("citizen");
    if (!paths.length) return { ok: false, message: "Nothing selected to remove." };
    if (MOCK) return { ok: true, message: `Removed ${paths.length} item(s) from this change. (demo mode)` };

    const gh = await getOctokit();
    const [headRef, baseRef] = await Promise.all([
      gh.rest.git.getRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${headBranch}` }),
      gh.rest.git.getRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${baseBranch}` }),
    ]);
    const headCommit = await gh.rest.git.getCommit({
      owner: REPO_OWNER, repo: REPO_NAME, commit_sha: headRef.data.object.sha,
    });

    const tree: { path: string; mode: "100644"; type: "blob"; sha: string | null }[] = [];
    for (const path of paths) {
      // Base version wins; absent in base = delete from the work branch.
      let sha: string | null = null;
      try {
        const baseFile = await gh.rest.repos.getContent({
          owner: REPO_OWNER, repo: REPO_NAME, path, ref: baseRef.data.object.sha,
        });
        sha = (baseFile.data as { sha: string }).sha;
      } catch (err: unknown) {
        if ((err as { status?: number }).status !== 404) throw err;
      }
      tree.push({ path, mode: "100644", type: "blob", sha });
    }

    const newTree = await gh.rest.git.createTree({
      owner: REPO_OWNER, repo: REPO_NAME, base_tree: headCommit.data.tree.sha, tree,
    });
    const commit = await gh.rest.git.createCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      message: `Remove ${paths.length} component(s) not part of this change\n\nSelected in OrbitOps.\n\nWork-Items: ${headBranch.match(/[A-Z][A-Z0-9]+-\d+|AB#\d+/)?.[0] ?? "POC-0"}`,
      tree: newTree.data.sha,
      parents: [headRef.data.object.sha],
    });
    await gh.rest.git.updateRef({
      owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${headBranch}`, sha: commit.data.sha,
    });
    revalidatePath("/promotions");
    return { ok: true, message: `Removed ${paths.length} item(s) from this change.` };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Conflict handoff: flag the promotion for a developer (E6.4). */
export async function requestDeveloperHelp(prNumber: number): Promise<ActionResult> {
  try {
    const user = await requireRole("citizen");
    if (MOCK) return { ok: true, message: "A developer has been asked to help. (demo mode)" };
    const gh = await getOctokit();
    await gh.rest.issues.createComment({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: prNumber,
      body: `🙋 **@${user.login} asked for developer help via OrbitOps** — this change overlaps with another change and needs the conflict resolved.`,
    });
    return { ok: true, message: "A developer has been asked to help with this change." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Create a work-item branch + draft promotion so a citizen dev can start a change. */
export async function startChange(
  formData: FormData
): Promise<ActionResult & { branch?: string }> {
  try {
    await requireRole("citizen");
    // Normalize: trim + uppercase so "proj-123" and "ab#456" are accepted as typed.
    const workItem = String(formData.get("workItem") ?? "").trim().toUpperCase();
    const description = String(formData.get("description") ?? "").trim();
    const sourceBranch = String(formData.get("sourceBranch") ?? "integration").trim();

    if (!WORK_ITEM_ONLY.test(workItem)) {
      return { ok: false, message: "Enter a valid work item ID — like PROJ-123 or AB#456." };
    }
    if (!description) return { ok: false, message: "Add a short description of the change." };

    const stages = await getPipeline();
    if (!stages.some((s) => s.branch === sourceBranch)) {
      return { ok: false, message: "Unknown stage." };
    }

    const slug = description.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
    const branch = `feature/${workItem}-${slug}`;

    if (MOCK) return { ok: true, message: `Change "${branch}" created! (demo mode)`, branch };

    // Branch-first flow: only the tagged work-item branch is created here.
    // The promotion (PR) is created later, by submitForPromotion, once the
    // builder has pulled real changes in — GitHub disallows empty PRs anyway.
    const gh = await getOctokit();
    const base = await gh.rest.git.getRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${sourceBranch}` });
    try {
      await gh.rest.git.createRef({
        owner: REPO_OWNER, repo: REPO_NAME, ref: `refs/heads/${branch}`, sha: base.data.object.sha,
      });
    } catch (err: unknown) {
      if ((err as { status?: number }).status !== 422) throw err; // 422 = branch exists: reuse it
    }

    revalidatePath("/pipeline");
    return {
      ok: true,
      message: "Your change is ready — taking you to it…",
      branch,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}
