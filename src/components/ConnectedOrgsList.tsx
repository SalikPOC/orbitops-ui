"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { copy } from "@/lib/copy";
import { disconnectOrg, type ActionResult } from "@/lib/actions";

export interface ConnectedOrgRow {
  name: string;
  org: string;
  authMethod: "sfdx-url" | "jwt";
  instanceHost: string;
  connectedBy: string;
}

export function ConnectedOrgsList({ orgs }: { orgs: ConnectedOrgRow[] }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ActionResult | null>(null);
  const router = useRouter();

  const disconnect = (o: ConnectedOrgRow) => {
    if (!window.confirm(copy.connectOrg.disconnectConfirm(o.name))) return;
    startTransition(async () => {
      const r = await disconnectOrg(o.org);
      setResult(r);
      if (r.ok) router.refresh();
    });
  };

  if (orgs.length === 0) return <p className="text-sm text-zinc-500">{copy.connectOrg.none}</p>;

  return (
    <div>
      <ul className="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 bg-white text-sm dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {orgs.map((o) => (
          <li key={o.org} className="flex flex-wrap items-center gap-2 px-4 py-2">
            <span className="font-medium">{o.name}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
                o.authMethod === "jwt"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              }`}
            >
              {o.authMethod === "jwt" ? copy.connectOrg.methodJwt : copy.connectOrg.methodLegacy}
            </span>
            <span className="text-xs text-zinc-400">{o.org}</span>
            <span className="ml-auto flex items-center gap-2">
              {/* API route (OAuth redirect) — plain anchor, prefetch would break it */}
              <a
                href={`/api/orgs/connect?name=${encodeURIComponent(o.name)}&domain=${encodeURIComponent(o.instanceHost)}`}
                className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                {copy.connectOrg.reconnect}
              </a>
              <button
                onClick={() => disconnect(o)}
                disabled={pending}
                className="rounded-lg border border-red-300 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                {copy.connectOrg.disconnect}
              </button>
            </span>
          </li>
        ))}
      </ul>
      {result && (
        <p className={`mt-2 text-sm ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
