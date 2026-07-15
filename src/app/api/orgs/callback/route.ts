import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, testRefresh, toSfdxAuthUrl, CALLBACK_PATH } from "@/lib/salesforce-oauth";
import { putRepoSecret, addConnectedOrg } from "@/lib/github-admin";

/**
 * Step 2 of Connect-an-org: Salesforce redirected back with a code. Exchange it
 * (PKCE), verify the refresh token actually works, seal it into the repo secret,
 * and register the org. Tokens never reach the browser.
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
    await testRefresh(ctx.loginUrl, token.refresh_token);
    await putRepoSecret(`${ctx.key}_SF_AUTH_URL`, toSfdxAuthUrl(token.refresh_token, token.instance_url));
    await addConnectedOrg({
      name: ctx.name,
      org: ctx.key,
      authMethod: "sfdx-url",
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
