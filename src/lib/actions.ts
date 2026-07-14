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
    revalidatePath("/pipeline");
    return { ok: true, message: "Promoted — the release is on its way." };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}

/** Create a work-item branch + draft promotion so a citizen dev can start a change. */
export async function startChange(formData: FormData): Promise<ActionResult> {
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

    if (MOCK) return { ok: true, message: `Change "${branch}" created! (demo mode)` };

    const gh = await getOctokit();
    const base = await gh.rest.git.getRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: `heads/${sourceBranch}` });
    await gh.rest.git.createRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `refs/heads/${branch}`,
      sha: base.data.object.sha,
    });
    const pr = await gh.rest.pulls.create({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      title: `${description} (${workItem})`,
      head: branch,
      base: sourceBranch,
      draft: true,
      body: `## What does this change do?\n\n${description}\n\n## Work Items\n\nWork-Items: ${workItem}\n`,
    });
    revalidatePath("/pipeline");
    return {
      ok: true,
      message: `Your change is ready. Build it in your sandbox, then pull your changes into #${pr.data.number}.`,
    };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Something went wrong." };
  }
}
