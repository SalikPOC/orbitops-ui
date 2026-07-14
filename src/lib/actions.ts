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
export async function pullChanges(headBranch: string, sourceOrg: string): Promise<ActionResult> {
  try {
    await requireRole("citizen");
    if (!headBranch.startsWith("feature/")) {
      return { ok: false, message: "Changes can only be pulled into a work-item change." };
    }
    if (!/^[A-Z][A-Z0-9_]*$/.test(sourceOrg)) return { ok: false, message: "Unknown org." };
    if (MOCK) return { ok: true, message: "Pulling your changes… (demo mode)" };
    const gh = await getOctokit();
    await gh.rest.actions.createWorkflowDispatch({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      workflow_id: "retrieve.yml",
      ref: "main",
      inputs: { work_branch: headBranch, source_org: sourceOrg },
    });
    return {
      ok: true,
      message: "Pulling your changes from the org — this takes a minute or two. The list below refreshes automatically.",
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
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
    const workItem = String(formData.get("workItem") ?? "").trim();
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
