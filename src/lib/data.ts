import "server-only";
import { load as yamlLoad } from "js-yaml";
import { MOCK, REPO_OWNER, REPO_NAME } from "./env";
import { getOctokit } from "./github";
import type { CheckChip, DeployManifest, Promotion, Stage } from "./types";
import { fixturePipeline, fixtureHistory, fixturePromotions } from "../../fixtures/fixtures";

const WORK_ITEM_RE = /\b[A-Z][A-Z0-9]+-\d+\b|\bAB#\d+\b/g;

interface PipelineConfig {
  pipeline: Stage[];
  devOrgs?: { name: string; org: string; authMethod: string }[];
}

async function getConfig(): Promise<PipelineConfig> {
  if (MOCK) {
    return {
      pipeline: fixturePipeline,
      devOrgs: [
        { name: "Shared dev org (also INT)", org: "INT", authMethod: "sfdx-url" },
        { name: "Demo dev sandbox", org: "DEV_DEMO", authMethod: "sfdx-url" },
      ],
    };
  }
  const gh = await getOctokit();
  const res = await gh.rest.repos.getContent({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: ".orbitops/pipeline.yml",
  });
  const content = Buffer.from((res.data as { content: string }).content, "base64").toString("utf8");
  return yamlLoad(content) as PipelineConfig;
}

export async function getPipeline(): Promise<Stage[]> {
  return (await getConfig()).pipeline;
}

/** Orgs a builder can pull changes from: devOrgs config + UI-connected orgs. */
export async function getSourceOrgs(): Promise<{ key: string; label: string }[]> {
  const cfg = await getConfig();
  const fromConfig = (cfg.devOrgs ?? []).map((d) => ({ key: d.org, label: d.name }));
  let connected: { key: string; label: string }[] = [];
  if (!MOCK) {
    const { readConnectedOrgs } = await import("./github-admin");
    connected = (await readConnectedOrgs()).map((o) => ({ key: o.org, label: o.name }));
  } else {
    connected = [{ key: "DEV_DEMO_CONNECTED", label: "Demo connected org" }];
  }
  const all = [...fromConfig, ...connected.filter((c) => !fromConfig.some((f) => f.key === c.key))];
  if (all.length) return all;
  const first = cfg.pipeline[0];
  return first ? [{ key: first.org, label: `${first.environment} org` }] : [];
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

export interface InProgressChange {
  branch: string;
  workItems: string[];
  title: string;
  aheadCount: number;
}

/** Work-item branches that don't have a promotion (PR) open yet — changes being built. */
export async function getInProgressChanges(baseBranch: string): Promise<InProgressChange[]> {
  if (MOCK) {
    return [
      {
        branch: "feature/POC-9-price-book-cleanup",
        workItems: ["POC-9"],
        title: "Price book cleanup",
        aheadCount: 0,
      },
    ];
  }
  const gh = await getOctokit();
  const [branches, prs] = await Promise.all([
    gh.rest.repos.listBranches({ owner: REPO_OWNER, repo: REPO_NAME, per_page: 100 }),
    gh.rest.pulls.list({ owner: REPO_OWNER, repo: REPO_NAME, state: "open", per_page: 100 }),
  ]);
  const withPr = new Set(prs.data.map((p) => p.head.ref));
  const features = branches.data.filter((b) => b.name.startsWith("feature/") && !withPr.has(b.name));

  return Promise.all(
    features.map(async (b) => {
      let aheadCount = 0;
      try {
        const cmp = await gh.rest.repos.compareCommitsWithBasehead({
          owner: REPO_OWNER, repo: REPO_NAME, basehead: `${baseBranch}...${b.name}`,
        });
        aheadCount = cmp.data.ahead_by;
      } catch {
        /* diverged/unknown — leave 0 */
      }
      const workItems = [...new Set(b.name.match(WORK_ITEM_RE) ?? [])];
      const slug = b.name
        .replace(/^feature\//, "")
        .replace(/^([A-Z][A-Z0-9]+-\d+|AB#\d+)-?/, "")
        .replace(/-/g, " ")
        .trim();
      return {
        branch: b.name,
        workItems,
        title: slug ? slug[0].toUpperCase() + slug.slice(1) : b.name,
        aheadCount,
      };
    })
  );
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

/** Visual flow diffs for every changed *.flow-meta.xml in a promotion. */
export async function getFlowDiffs(
  baseBranch: string,
  headBranch: string,
  files: { filename: string; status: string }[]
): Promise<Record<string, import("./flow-diff").FlowDiffModel>> {
  const { diffFlows } = await import("./flow-diff");
  const flowFiles = files.filter((f) => f.filename.endsWith(".flow-meta.xml"));
  if (!flowFiles.length) return {};

  if (MOCK) {
    const { caseRoutingBase, caseRoutingHead } = await import("../../fixtures/flows");
    return Object.fromEntries(flowFiles.map((f) => [f.filename, diffFlows(caseRoutingBase, caseRoutingHead)]));
  }

  const gh = await getOctokit();
  const fileAt = async (path: string, ref: string): Promise<string | null> => {
    try {
      const res = await gh.rest.repos.getContent({ owner: REPO_OWNER, repo: REPO_NAME, path, ref });
      return Buffer.from((res.data as { content: string }).content, "base64").toString("utf8");
    } catch (err: unknown) {
      if ((err as { status?: number }).status === 404) return null;
      throw err;
    }
  };
  const entries = await Promise.all(
    flowFiles.map(async (f) => {
      const [baseXml, headXml] = await Promise.all([
        fileAt(f.filename, baseBranch),
        fileAt(f.filename, headBranch),
      ]);
      return [f.filename, diffFlows(baseXml, headXml)] as const;
    })
  );
  return Object.fromEntries(entries);
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

export interface RollbackPreview {
  env: string;
  targetSeq: number;
  currentSeq: number;
  includeDestructive: boolean;
  safety: {
    changed: Record<string, string[]>;
    destructive: Record<string, string[]>;
    changedCount: number;
    destructiveCount: number;
    warnings: { severity: string; type: string; member: string; text: string }[];
    highRiskCount: number;
  };
  validation: { succeeded: boolean; errors: string | null };
  runId: string;
  timestamp: string;
}

/** Preview report published by the rollback workflow, or null while it's still running. */
export async function getRollbackPreview(runId: string): Promise<RollbackPreview | null> {
  if (MOCK) {
    return {
      env: "integration",
      targetSeq: 1,
      currentSeq: 3,
      includeDestructive: true,
      safety: {
        changed: {},
        destructive: { CustomField: ["BUP_Clinic__c.Notes__c"] },
        changedCount: 0,
        destructiveCount: 1,
        warnings: [
          {
            severity: "high",
            type: "CustomField",
            member: "BUP_Clinic__c.Notes__c",
            text: "🔴 Deleting a field permanently destroys all data stored in it. This cannot be undone.",
          },
        ],
        highRiskCount: 1,
      },
      validation: { succeeded: true, errors: null },
      runId,
      timestamp: new Date().toISOString(),
    };
  }
  const gh = await getOctokit();
  try {
    const res = await gh.rest.repos.getContent({
      owner: REPO_OWNER, repo: REPO_NAME, path: `rollback-previews/${runId}.json`, ref: "orbitops-meta",
    });
    return JSON.parse(Buffer.from((res.data as { content: string }).content, "base64").toString("utf8"));
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

/** Newest run of a workflow created at/after the given time (to find our dispatch). */
export async function findRecentRun(
  workflowFile: string,
  sinceIso: string
): Promise<{ id: number; status: string; conclusion: string | null; url: string } | null> {
  if (MOCK) return { id: 1, status: "completed", conclusion: "success", url: "https://github.com" };
  const gh = await getOctokit();
  const runs = await gh.rest.actions.listWorkflowRuns({
    owner: REPO_OWNER, repo: REPO_NAME, workflow_id: workflowFile, per_page: 5, created: `>=${sinceIso}`,
  });
  const run = runs.data.workflow_runs[0];
  return run
    ? { id: run.id, status: run.status ?? "queued", conclusion: run.conclusion, url: run.html_url }
    : null;
}

export async function getRunStatus(
  runId: number
): Promise<{ status: string; conclusion: string | null; url: string }> {
  if (MOCK) return { status: "completed", conclusion: "success", url: "https://github.com" };
  const gh = await getOctokit();
  const run = await gh.rest.actions.getWorkflowRun({ owner: REPO_OWNER, repo: REPO_NAME, run_id: runId });
  return { status: run.data.status ?? "queued", conclusion: run.data.conclusion, url: run.data.html_url };
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

export interface ActiveRun {
  status: string;
  url: string;
  startedAt: string; // ISO — lets the UI show "for 18h" so stuck runs are visible
}

/** Latest deploy-workflow run for a stage branch, when one is active or gated. */
export async function getActiveDeployRun(branch: string): Promise<ActiveRun | null> {
  if (MOCK) {
    return branch === "uat"
      ? { status: "waiting", url: "https://github.com", startedAt: new Date(Date.now() - 90 * 60_000).toISOString() }
      : null;
  }
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
  if (!active.includes(run.status ?? "")) return null;
  return { status: run.status!, url: run.html_url, startedAt: run.run_started_at ?? run.created_at };
}

/**
 * One chip per check name. listForRef can return same-named runs from
 * different workflows/attempts on the same SHA; keep the newest (the API
 * returns most-recently-started first) — duplicates broke React keys.
 */
function toCheckChips(
  runs: { name: string; conclusion: string | null; status: string; html_url: string | null }[]
): Promotion["checks"] {
  const seen = new Set<string>();
  const chips: Promotion["checks"] = [];
  for (const c of runs) {
    if (seen.has(c.name)) continue;
    seen.add(c.name);
    chips.push({ name: c.name, status: chipStatus(c.conclusion, c.status), url: c.html_url ?? undefined });
  }
  return chips;
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
      checks: toCheckChips(checks.data.check_runs),
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
        checks: toCheckChips(checks.data.check_runs),
      } satisfies Promotion;
    })
  );
}
