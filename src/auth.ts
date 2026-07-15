import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { MOCK } from "@/lib/env";
import { roleFor } from "@/lib/roles";
import type { SessionUser } from "@/lib/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: {
    jwt({ token, profile, account }) {
      if (profile?.login) token.login = profile.login as string;
      // The user-to-server token: deployment approvals act as the signed-in
      // user (a real required reviewer) — GitHub Apps can't be reviewers on
      // personal-account repos, so the installation token can't approve.
      if (account?.access_token) token.ghToken = account.access_token;
      return token;
    },
    session({ session, token }) {
      const login = (token.login as string) ?? session.user?.name ?? "unknown";
      (session as unknown as { orbitops: SessionUser }).orbitops = {
        login,
        role: roleFor(login),
      };
      (session as unknown as { ghToken?: string }).ghToken = token.ghToken as string | undefined;
      return session;
    },
  },
});

/** The signed-in user's GitHub token (user-to-server) — for actions that must
 *  be authorized as the person, e.g. reviewing gated deployments. */
export async function getUserToken(): Promise<string | null> {
  if (MOCK) return null;
  const session = await auth();
  return (session as unknown as { ghToken?: string })?.ghToken ?? null;
}

/** Session for the app: real Auth.js session, or a fake release manager in MOCK mode. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (MOCK) return { login: "demo-user", role: "release-manager" };
  const session = await auth();
  return (session as unknown as { orbitops?: SessionUser })?.orbitops ?? null;
}
