import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { MOCK } from "@/lib/env";
import { roleFor } from "@/lib/roles";
import type { SessionUser } from "@/lib/types";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [GitHub],
  callbacks: {
    jwt({ token, profile }) {
      if (profile?.login) token.login = profile.login as string;
      return token;
    },
    session({ session, token }) {
      const login = (token.login as string) ?? session.user?.name ?? "unknown";
      (session as unknown as { orbitops: SessionUser }).orbitops = {
        login,
        role: roleFor(login),
      };
      return session;
    },
  },
});

/** Session for the app: real Auth.js session, or a fake release manager in MOCK mode. */
export async function getSessionUser(): Promise<SessionUser | null> {
  if (MOCK) return { login: "demo-user", role: "release-manager" };
  const session = await auth();
  return (session as unknown as { orbitops?: SessionUser })?.orbitops ?? null;
}
