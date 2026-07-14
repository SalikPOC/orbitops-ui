import "server-only";
import { load as yamlLoad } from "js-yaml";
import { MOCK, REPO_OWNER, REPO_NAME } from "./env";
import { getOctokit } from "./github";
import type { CheckChip, DeployManifest, Promotion, Stage } from "./types";
import { fixturePipeline, fixtureHistory, fixturePromotions } from "../../fixtures/fixtures";

const WORK_ITEM_RE = /\b[A-Z][A-Z0-9]+-\d+\b|\bAB#\d+\b/g;

export async function getPipeline(): Promise<Stage[]> {
  if (MOCK) return fixturePipeline;
  const gh = await getOctokit();
  const res = await gh.rest.repos.getContent({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: ".orbitops/pipeline.yml",
  });
  const content = Buffer.from((res.data as { content: string }).content, "base64").toString("utf8");
  return (yamlLoad(content) as { pipeline: Stage[] }).pipeline;
}

export async function getDeployHistory(env: string): Promise<DeployManifest[]> {
  if (MOCK) return fixtureHistory.filter((m) => m.env === env).sort((a, b) => b.seq - a.seq);
  const gh = await getOctokit();
  try {
    const dir = await gh.rest.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: `deployments/${env}`,
      ref: "orbitops-meta",
    });
    const files = (dir.data as { name: string; path: string }[]).filter((f) => f.name.endsWith(".json"));
    const manifests = await Promise.all(
      files.map(async (f) => {
        const res = await gh.rest.repos.getContent({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          path: f.path,
          ref: "orbitops-meta",
        });
        return JSON.parse(
          Buffer.from((res.data as { content: string }).content, "base64").toString("utf8")
        ) as DeployManifest;
      })
    );
    return manifests.sort((a, b) => b.seq - a.seq);
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) return []; // no deploys yet
    throw err;
  }
}

function chipStatus(conclusion: string | null, status: string): CheckChip["status"] {
  if (status !== "completed") return "pending";
  if (conclusion === "success") return "success";
  if (conclusion === "skipped" || conclusion === "neutral") return "skipped";
  return "failure";
}

/** Changed files between a promotion's target and its work branch. */
export async function getPromotionFiles(
  baseBranch: string,
  headBranch: string
): Promise<{ filename: string; status: string; patch?: string }[]> {
  if (MOCK) {
    return [
      {
        filename: "force-app/main/default/objects/BUP_Clinic__c/fields/Discount__c.field-meta.xml",
        status: "added",
        patch:
          '@@ -0,0 +1,8 @@\n+<?xml version="1.0" encoding="UTF-8"?>\n+<CustomField xmlns="http://soap.sforce.com/2006/04/metadata">\n+    <fullName>Discount__c</fullName>\n+    <label>Discount</label>\n+    <type>Percent</type>\n+</CustomField>',
      },
      {
        filename: "force-app/main/default/flows/Case_Routing.flow-meta.xml",
        status: "modified",
        patch: "@@ -12,7 +12,7 @@\n-        <targetReference>Old_Step</targetReference>\n+        <targetReference>New_Step</targetReference>",
      },
    ];
  }
  const gh = await getOctokit();
  const cmp = await gh.rest.repos.compareCommitsWithBasehead({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    basehead: `${baseBranch}...${headBranch}`,
  });
  return (cmp.data.files ?? []).map((f) => ({ filename: f.filename, status: f.status, patch: f.patch }));
}

/** Latest retrieve-workflow run for a work branch (via dispatch inputs we set). */
export async function getActiveRetrieveRun(): Promise<{ status: string; url: string } | null> {
  if (MOCK) return null;
  const gh = await getOctokit();
  const runs = await gh.rest.actions.listWorkflowRuns({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    workflow_id: "retrieve.yml",
    per_page: 1,
  });
  const run = runs.data.workflow_runs[0];
  if (!run) return null;
  const active = ["in_progress", "queued", "waiting", "requested", "pending"];
  return active.includes(run.status ?? "") ? { status: run.status!, url: run.html_url } : null;
}

/** Body of the workflow-authored sticky comment carrying the given marker, or null. */
export async function getStickyComment(prNumber: number, marker: string): Promise<string | null> {
  if (MOCK) {
    return marker.includes("deploy-preview")
      ? "## 📦 What will deploy\n\n**1** component to deploy:\n\n- **CustomField** (1)\n  - BUP_Clinic__c.Discount__c"
      : null;
  }
  const gh = await getOctokit();
  const comments = await gh.rest.issues.listComments({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    issue_number: prNumber,
    per_page: 100,
  });
  return comments.data.find((c) => c.body?.includes(marker))?.body ?? null;
}

/** Latest deploy-workflow run for a stage branch, when one is active or gated. */
export async function getActiveDeployRun(
  branch: string
): Promise<{ status: string; url: string } | null> {
  if (MOCK) return branch === "uat" ? { status: "waiting", url: "https://github.com" } : null;
  const gh = await getOctokit();
  const runs = await gh.rest.actions.listWorkflowRuns({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    workflow_id: "deploy.yml",
    branch,
    per_page: 1,
  });
  const run = runs.data.workflow_runs[0];
  if (!run) return null;
  const active = ["in_progress", "queued", "waiting", "requested", "pending"];
  return active.includes(run.status ?? "") ? { status: run.status!, url: run.html_url } : null;
}

export async function getPromotion(number: number): Promise<Promotion | null> {
  if (MOCK) return fixturePromotions.find((p) => p.number === number) ?? null;
  const gh = await getOctokit();
  try {
    const pr = await gh.rest.pulls.get({ owner: REPO_OWNER, repo: REPO_NAME, pull_number: number });
    const checks = await gh.rest.checks.listForRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: pr.data.head.sha,
      per_page: 50,
    });
    const text = `${pr.data.title}\n${pr.data.head.ref}\n${pr.data.body ?? ""}`;
    return {
      number,
      title: pr.data.title,
      author: pr.data.user?.login ?? "unknown",
      headBranch: pr.data.head.ref,
      baseBranch: pr.data.base.ref,
      workItems: [...new Set(text.match(WORK_ITEM_RE) ?? [])],
      mergeable: pr.data.mergeable,
      url: pr.data.html_url,
      checks: checks.data.check_runs.map((c) => ({
        name: c.name,
        status: chipStatus(c.conclusion, c.status),
        url: c.html_url ?? undefined,
      })),
    };
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export async function getOpenPromotions(stageBranches: string[]): Promise<Promotion[]> {
  if (MOCK) return fixturePromotions;
  const gh = await getOctokit();
  const prs = await gh.rest.pulls.list({ owner: REPO_OWNER, repo: REPO_NAME, state: "open", per_page: 50 });
  const promotions = prs.data.filter((pr) => stageBranches.includes(pr.base.ref));

  return Promise.all(
    promotions.map(async (pr) => {
      const [detail, checks] = await Promise.all([
        gh.rest.pulls.get({ owner: REPO_OWNER, repo: REPO_NAME, pull_number: pr.number }),
        gh.rest.checks.listForRef({ owner: REPO_OWNER, repo: REPO_NAME, ref: pr.head.sha, per_page: 50 }),
      ]);
      const text = `${pr.title}\n${pr.head.ref}\n${pr.body ?? ""}`;
      return {
        number: pr.number,
        title: pr.title,
        author: pr.user?.login ?? "unknown",
        headBranch: pr.head.ref,
        baseBranch: pr.base.ref,
        workItems: [...new Set(text.match(WORK_ITEM_RE) ?? [])],
        mergeable: detail.data.mergeable,
        url: pr.html_url,
        checks: checks.data.check_runs.map((c) => ({
          name: c.name,
          status: chipStatus(c.conclusion, c.status),
          url: c.html_url ?? undefined,
        })),
      } satisfies Promotion;
    })
  );
}
