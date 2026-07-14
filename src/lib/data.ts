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
