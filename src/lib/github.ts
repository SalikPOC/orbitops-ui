import "server-only";
import { App } from "octokit";
import type { Octokit } from "octokit";
import { MOCK } from "./env";

let cached: Octokit | null = null;

/** Installation-scoped Octokit for the pipeline repo. Never used in MOCK mode. */
export async function getOctokit(): Promise<Octokit> {
  if (MOCK) throw new Error("getOctokit() must not be called in MOCK mode");
  if (cached) return cached;

  const appId = process.env.GITHUB_APP_ID;
  const installationId = process.env.GITHUB_APP_INSTALLATION_ID;
  const privateKey = process.env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!appId || !installationId || !privateKey) {
    throw new Error(
      "GitHub App is not configured — set GITHUB_APP_ID / GITHUB_APP_INSTALLATION_ID / GITHUB_APP_PRIVATE_KEY in .env.local (see docs/GITHUB_APP.md), or run with MOCK=1"
    );
  }

  const app = new App({ appId, privateKey });
  cached = (await app.getInstallationOctokit(Number(installationId))) as unknown as Octokit;
  return cached;
}
