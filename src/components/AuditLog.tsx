"use client";
import { useMemo, useState } from "react";
import { copy } from "@/lib/copy";
import type { DeployManifest } from "@/lib/types";

function toCsv(events: DeployManifest[]): string {
  const header = "env,seq,type,actor,timestamp,workItems,components,removed,reason,runUrl";
  const rows = events.map((m) =>
    [
      m.env, m.seq, m.type, m.actor, m.timestamp,
      `"${m.workItems.join(" ")}"`, m.componentCount, m.destructiveCount,
      `"${(m.reason ?? "").replaceAll('"', '""')}"`, m.runUrl,
    ].join(",")
  );
  return [header, ...rows].join("\n");
}

export function AuditLog({ events }: { events: DeployManifest[] }) {
  const [env, setEnv] = useState("all");
  const [type, setType] = useState("all");
  const envs = useMemo(() => [...new Set(events.map((e) => e.env))], [events]);

  const filtered = events.filter(
    (m) => (env === "all" || m.env === env) && (type === "all" || m.type === type)
  );

  const exportCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "orbitops-activity.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const selectCls =
    "rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-xs dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <div className="max-w-2xl">
      <div className="mb-3 flex items-center gap-2">
        <select value={env} onChange={(e) => setEnv(e.target.value)} className={selectCls} aria-label="Filter by stage">
          <option value="all">All stages</option>
          {envs.map((e) => (
            <option key={e} value={e} className="capitalize">{e}</option>
          ))}
        </select>
        <select value={type} onChange={(e) => setType(e.target.value)} className={selectCls} aria-label="Filter by activity">
          <option value="all">All activity</option>
          <option value="deploy">Releases</option>
          <option value="rollback">Back outs</option>
        </select>
        <button
          onClick={exportCsv}
          className="ml-auto rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Export CSV
        </button>
      </div>
      <ol className="space-y-2">
        {filtered.map((m) => (
          <li
            key={`${m.env}-${m.seq}`}
            className="rounded-xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900"
          >
            <span className="font-medium">{m.actor}</span>{" "}
            {m.type === "rollback"
              ? `backed out ${m.env} to release #${m.rolledBackTo}`
              : `released #${m.seq} to ${m.env}`}
            <span className="ml-2 text-xs text-zinc-400">{new Date(m.timestamp).toLocaleString()}</span>
            {m.reason && <div className="mt-1 text-xs text-zinc-500">Reason: {m.reason}</div>}
            <a
              href={m.runUrl}
              target="_blank"
              rel="noreferrer"
              className="ml-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {copy.deployments.viewDetails}
            </a>
          </li>
        ))}
        {filtered.length === 0 && <li className="text-sm text-zinc-500">Nothing matches these filters.</li>}
      </ol>
    </div>
  );
}
