import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/auth";
import { MOCK } from "@/lib/env";
import { authorizeUrl, newPkce, orgKeyFromName, CALLBACK_PATH } from "@/lib/salesforce-oauth";

/** Step 1 of Connect-an-org: send the builder to Salesforce's login page. */
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/api/auth/signin", req.url));
  if (MOCK) return NextResponse.redirect(new URL("/settings?connect=mock", req.url));

  const name = req.nextUrl.searchParams.get("name")?.trim();
  const orgType = req.nextUrl.searchParams.get("orgType") ?? "sandbox";
  const customDomain = req.nextUrl.searchParams.get("domain")?.trim();
  if (!name) return NextResponse.redirect(new URL("/connect-org?error=name", req.url));

  let loginUrl = orgType === "production" ? "https://login.salesforce.com" : "https://test.salesforce.com";
  if (customDomain) {
    try {
      const u = new URL(customDomain.startsWith("http") ? customDomain : `https://${customDomain}`);
      if (!u.hostname.endsWith(".salesforce.com")) throw new Error("not salesforce");
      loginUrl = `https://${u.hostname}`;
    } catch {
      return NextResponse.redirect(new URL("/connect-org?error=domain", req.url));
    }
  }

  const { verifier, challenge, state } = newPkce();
  const redirectUri = new URL(CALLBACK_PATH, req.nextUrl.origin).toString();
  const res = NextResponse.redirect(authorizeUrl(loginUrl, redirectUri, challenge, state));
  res.cookies.set(
    "orbitops_connect",
    JSON.stringify({ state, verifier, loginUrl, name, key: orgKeyFromName(name), by: user.login }),
    { httpOnly: true, sameSite: "lax", maxAge: 600, path: "/" }
  );
  return res;
}
