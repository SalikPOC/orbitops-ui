import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * Salesforce OAuth 2.0 authorization-code + PKCE helpers for "Connect an org".
 * The existing "OrbitOps CI" connected app is the client for every org
 * (connected app consumer keys are global across Salesforce). Secretless
 * exchange — the app has isConsumerSecretOptional enabled.
 */

export const OAUTH_SCOPES = "api refresh_token";
export const CALLBACK_PATH = "/api/orgs/callback";

export function clientId(): string {
  const id = process.env.SF_OAUTH_CLIENT_ID;
  if (!id) throw new Error("SF_OAUTH_CLIENT_ID is not set in .env.local");
  return id;
}

const b64url = (buf: Buffer) => buf.toString("base64url");

export function newPkce() {
  const verifier = b64url(randomBytes(48));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const state = b64url(randomBytes(24));
  return { verifier, challenge, state };
}

export function authorizeUrl(loginUrl: string, redirectUri: string, challenge: string, state: string) {
  const u = new URL("/services/oauth2/authorize", loginUrl);
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", clientId());
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("scope", OAUTH_SCOPES);
  u.searchParams.set("code_challenge", challenge);
  u.searchParams.set("code_challenge_method", "S256");
  u.searchParams.set("state", state);
  // Always show the login screen: silent session reuse connects whatever org the
  // browser happens to be signed into — surprising and wrong-org-prone. The login
  // page also carries the "Use Custom Domain" link for manual entry.
  u.searchParams.set("prompt", "login");
  return u.toString();
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  instance_url: string;
  id: string;
}

export async function exchangeCode(
  loginUrl: string,
  redirectUri: string,
  code: string,
  verifier: string
): Promise<TokenResponse> {
  const res = await fetch(new URL("/services/oauth2/token", loginUrl), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId(),
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier,
    }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Salesforce rejected the connection: ${body.error_description ?? body.error}`);
  if (!body.refresh_token) throw new Error("Salesforce did not return a refresh token (check the app's scopes).");
  return body as TokenResponse;
}

/** Prove the refresh token works before we save anything. */
/**
 * Verify the refresh token works, and return the token to seal: if the
 * connected app has refresh-token rotation enabled, this refresh mints a NEW
 * token and invalidates the one we were given — sealing the original would
 * store a dead credential. (Rotation should be OFF for CI use; this makes a
 * misconfigured app fail on the second run instead of the first.)
 */
export async function testRefresh(loginUrl: string, refreshToken: string): Promise<string> {
  const res = await fetch(new URL("/services/oauth2/token", loginUrl), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: clientId(),
      refresh_token: refreshToken,
    }),
  });
  if (!res.ok) throw new Error("The connection was created but could not be verified — try again.");
  const body = (await res.json()) as { refresh_token?: string };
  return body.refresh_token ?? refreshToken; // rotated token when rotation is on
}

/** sfdx auth URL the CI replays with `sf org login sfdx-url` (secretless form). */
export function toSfdxAuthUrl(refreshToken: string, instanceUrl: string): string {
  const host = new URL(instanceUrl).host;
  return `force://${clientId()}::${refreshToken}@${host}`;
}

/** Org key for secrets/registry: DEV_ + sanitized name, e.g. "Jane's Dev" → DEV_JANE_S_DEV */
export function orgKeyFromName(name: string): string {
  const core = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
  return `DEV_${core || "ORG"}`;
}
