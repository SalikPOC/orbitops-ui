import "server-only";
import sodium from "libsodium-wrappers";
import { getOctokit } from "./github";
import { REPO_OWNER, REPO_NAME } from "./env";

/** Seal and store a repository Actions secret (requires the App's Secrets permission). */
export async function putRepoSecret(name: string, value: string): Promise<void> {
  const gh = await getOctokit();
  let key;
  try {
    key = await gh.rest.actions.getRepoPublicKey({ owner: REPO_OWNER, repo: REPO_NAME });
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 403 || (err as { status?: number }).status === 404) {
      throw new Error(
        "The GitHub App can't manage secrets yet — grant it the 'Secrets' repository permission (app settings → Permissions), accept the update on the installation, then retry."
      );
    }
    throw err;
  }
  await sodium.ready;
  const sealed = sodium.crypto_box_seal(
    sodium.from_string(value),
    sodium.from_base64(key.data.key, sodium.base64_variants.ORIGINAL)
  );
  await gh.rest.actions.createOrUpdateRepoSecret({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    secret_name: name,
    encrypted_value: sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL),
    key_id: key.data.key_id,
  });
}

export interface ConnectedOrg {
  name: string;
  org: string;
  authMethod: "sfdx-url";
  connectedBy: string;
  connectedAt: string;
  instanceHost: string;
}

const REGISTRY_PATH = "connected-orgs.json";
const META_BRANCH = "orbitops-meta";

export async function readConnectedOrgs(): Promise<ConnectedOrg[]> {
  const gh = await getOctokit();
  try {
    const res = await gh.rest.repos.getContent({
      owner: REPO_OWNER, repo: REPO_NAME, path: REGISTRY_PATH, ref: META_BRANCH,
    });
    return JSON.parse(Buffer.from((res.data as { content: string }).content, "base64").toString("utf8"));
  } catch (err: unknown) {
    if ((err as { status?: number }).status === 404) return [];
    throw err;
  }
}

export async function addConnectedOrg(entry: ConnectedOrg): Promise<void> {
  const gh = await getOctokit();
  let sha: string | undefined;
  let existing: ConnectedOrg[] = [];
  try {
    const res = await gh.rest.repos.getContent({
      owner: REPO_OWNER, repo: REPO_NAME, path: REGISTRY_PATH, ref: META_BRANCH,
    });
    sha = (res.data as { sha: string }).sha;
    existing = JSON.parse(Buffer.from((res.data as { content: string }).content, "base64").toString("utf8"));
  } catch (err: unknown) {
    if ((err as { status?: number }).status !== 404) throw err;
  }
  const updated = [...existing.filter((o) => o.org !== entry.org), entry];
  await gh.rest.repos.createOrUpdateFileContents({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path: REGISTRY_PATH,
    ref: META_BRANCH,
    branch: META_BRANCH,
    message: `Connect org: ${entry.name} (${entry.org})`,
    content: Buffer.from(JSON.stringify(updated, null, 2) + "\n").toString("base64"),
    sha,
  });
}
