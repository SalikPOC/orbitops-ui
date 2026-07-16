import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, fetchUsername, CALLBACK_PATH } from "@/lib/salesforce-oauth";
import { addConnectedOrg } from "@/lib/github-admin";

/**
 * Step 2 of Connect-an-org: Salesforce redirected back with a code. Exchange it
 * (PKCE), read the signed-in user's identity, and register the org with just
 * {username, instanceHost} — NO tokens are stored anywhere. CI authenticates
 * via JWT with the shared OrbitOps CI certificate as that user, which requires
 * the org admin to have pre-authorized the app (Install → admin-approved →
 * profile/permission set). Salesforce force-rotates refresh tokens in new
 * orgs, so stored tokens die on first use — JWT sidesteps tokens entirely.
 */
export async function GET(req: NextRequest) {
  const fail = (msg: string) =>
    NextResponse.redirect(new URL(`/connect-org?error=${encodeURIComponent(msg)}`, req.url));

  const raw = req.cookies.get("orbitops_connect")?.value;
  if (!raw) return fail("The connection attempt expired — try again.");
  let ctx: { state: string; verifier: string; loginUrl: string; name: string; key: string; by: string };
  try {
    ctx = JSON.parse(raw);
  } catch {
    return fail("The connection attempt was malformed — try again.");
  }

  // Salesforce redirects OAuth failures here with error params — surface them
  // usefully instead of a generic message, and hint at the My Domain fallback.
  const sfError = req.nextUrl.searchParams.get("error");
  if (sfError) {
    const desc = req.nextUrl.searchParams.get("error_description") ?? sfError;
    return fail(
      `Salesforce couldn't complete the connection (${desc}). ` +
        `If this org enforces its own login domain, add its My Domain below and try again.`
    );
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!code || state !== ctx.state) return fail("Salesforce returned an invalid response — try again.");

  try {
    const redirectUri = new URL(CALLBACK_PATH, req.nextUrl.origin).toString();
    const token = await exchangeCode(ctx.loginUrl, redirectUri, code, ctx.verifier);
    const username = await fetchUsername(token.id, token.access_token);
    await addConnectedOrg({
      name: ctx.name,
      org: ctx.key,
      authMethod: "jwt",
      username,
      connectedBy: ctx.by,
      connectedAt: new Date().toISOString(),
      instanceHost: new URL(token.instance_url).host,
    });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Something went wrong.");
  }

  const res = NextResponse.redirect(new URL("/settings?connected=1", req.url));
  res.cookies.delete("orbitops_connect");
  return res;
}
