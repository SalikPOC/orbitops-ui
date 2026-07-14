import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { copy } from "@/lib/copy";
import { MOCK } from "@/lib/env";
import { getSessionUser } from "@/auth";

export const metadata: Metadata = {
  title: copy.appName,
  description: copy.tagline,
};

const nav = [
  { href: "/pipeline", label: copy.nav.pipeline },
  { href: "/deployments", label: copy.nav.deployments },
  { href: "/rollback", label: copy.nav.rollback },
  { href: "/settings", label: copy.nav.settings },
  { href: "/audit", label: copy.nav.audit },
];

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  return (
    <html lang="en">
      <body className="min-h-screen bg-zinc-50 text-zinc-900 antialiased dark:bg-zinc-950 dark:text-zinc-100">
        <div className="flex min-h-screen">
          <aside className="flex w-60 shrink-0 flex-col border-r border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mb-1 flex items-center gap-2 px-2">
              <span className="text-xl">🛰️</span>
              <span className="text-lg font-semibold tracking-tight">{copy.appName}</span>
            </div>
            <p className="mb-6 px-2 text-xs text-zinc-500">{copy.tagline}</p>
            <nav className="flex flex-col gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="mt-auto space-y-2 px-2 pt-6">
              {MOCK && (
                <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                  {copy.mockBadge}
                </span>
              )}
              {user ? (
                <div className="text-xs text-zinc-500">
                  <div className="font-medium text-zinc-700 dark:text-zinc-300">{user.login}</div>
                  <div>{copy.roles[user.role]}</div>
                </div>
              ) : (
                <a
                  href="/api/auth/signin"
                  className="block rounded-lg bg-zinc-900 px-3 py-2 text-center text-xs font-semibold text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {copy.signIn}
                </a>
              )}
            </div>
          </aside>
          <main className="flex-1 overflow-x-auto p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
