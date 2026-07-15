"use client";
import { useMemo, useState } from "react";
import type { FlowDiffModel, FlowNode, FlowNodeStatus } from "@/lib/flow-diff";
import { kindLabel } from "@/lib/flow-diff";

const NODE_W = 168;
const NODE_H = 52;

const statusStyle: Record<FlowNodeStatus, { box: string; text: string; badge: string }> = {
  added: { box: "fill-emerald-50 stroke-emerald-500", text: "fill-emerald-900", badge: "New" },
  changed: { box: "fill-amber-50 stroke-amber-500", text: "fill-amber-900", badge: "Changed" },
  removed: { box: "fill-red-50 stroke-red-400", text: "fill-red-900", badge: "Removed" },
  unchanged: { box: "fill-white stroke-zinc-300", text: "fill-zinc-700", badge: "" },
};
const edgeColor: Record<FlowNodeStatus, string> = {
  added: "stroke-emerald-500",
  removed: "stroke-red-400",
  changed: "stroke-amber-500",
  unchanged: "stroke-zinc-300",
};

function Legend() {
  const items: [FlowNodeStatus, string][] = [
    ["added", "New"],
    ["changed", "Changed"],
    ["removed", "Removed"],
    ["unchanged", "Unchanged"],
  ];
  const dot: Record<FlowNodeStatus, string> = {
    added: "bg-emerald-500",
    changed: "bg-amber-500",
    removed: "bg-red-400",
    unchanged: "bg-zinc-300",
  };
  return (
    <div className="flex gap-3 text-[11px] text-zinc-500">
      {items.map(([s, label]) => (
        <span key={s} className="flex items-center gap-1">
          <span className={`inline-block h-2 w-2 rounded-full ${dot[s]}`} /> {label}
        </span>
      ))}
    </div>
  );
}

export function FlowDiffViewer({ model }: { model: FlowDiffModel }) {
  const [focus, setFocus] = useState<string | null>(null);
  const byName = useMemo(() => new Map(model.nodes.map((n) => [n.name, n])), [model.nodes]);

  const { minX, minY, width, height } = useMemo(() => {
    const xs = model.nodes.map((n) => n.x);
    const ys = model.nodes.map((n) => n.y);
    const minX = Math.min(...xs, 0) - 40;
    const minY = Math.min(...ys, 0) - 40;
    return {
      minX,
      minY,
      width: Math.max(...xs, 200) - minX + NODE_W + 80,
      height: Math.max(...ys, 200) - minY + NODE_H + 80,
    };
  }, [model.nodes]);

  const changedCount = model.nodes.filter((n) => n.status !== "unchanged").length;

  return (
    <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <span className="text-sm font-semibold">{model.flowLabel}</span>
        {model.statusBase !== model.statusHead && (
          <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[11px] font-medium text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300">
            {model.statusBase ?? "not in target"} → {model.statusHead ?? "removed"}
          </span>
        )}
        <span className="text-xs text-zinc-500">
          {changedCount} element{changedCount === 1 ? "" : "s"} differ
        </span>
        <div className="ml-auto">
          <Legend />
        </div>
      </div>

      <div className="flex gap-3">
        {/* Element sidebar (Gearset-style overview) */}
        <div className="w-48 shrink-0 space-y-1 overflow-auto" style={{ maxHeight: 420 }}>
          {model.nodes
            .filter((n) => n.status !== "unchanged")
            .map((n) => (
              <button
                key={n.name}
                onClick={() => setFocus(n.name === focus ? null : n.name)}
                className={`block w-full rounded-lg border px-2 py-1 text-left text-xs ${
                  focus === n.name ? "border-indigo-500" : "border-zinc-200 dark:border-zinc-700"
                } bg-white dark:bg-zinc-800`}
              >
                <span
                  className={`mr-1 inline-block h-2 w-2 rounded-full ${
                    n.status === "added" ? "bg-emerald-500" : n.status === "changed" ? "bg-amber-500" : "bg-red-400"
                  }`}
                />
                <span className="font-medium">{n.label}</span>
                <span className="block pl-3 text-[10px] text-zinc-400">
                  {kindLabel(n.kind)} · {statusStyle[n.status].badge}
                </span>
              </button>
            ))}
          {model.logicChanges.map((l) => (
            <div
              key={l.name}
              className="block w-full rounded-lg border border-dashed border-zinc-200 px-2 py-1 text-left text-xs dark:border-zinc-700"
            >
              <span
                className={`mr-1 inline-block h-2 w-2 rounded-full ${
                  l.status === "added" ? "bg-emerald-500" : l.status === "changed" ? "bg-amber-500" : "bg-red-400"
                }`}
              />
              <span className="font-medium">{l.name}</span>
              <span className="block pl-3 text-[10px] text-zinc-400">{l.kind} (logic)</span>
            </div>
          ))}
          {changedCount === 0 && model.logicChanges.length === 0 && (
            <p className="text-xs text-zinc-400">Identical in both stages.</p>
          )}
        </div>

        {/* Canvas — Flow Builder coordinates straight from the XML */}
        <div className="grow overflow-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-950" style={{ maxHeight: 420 }}>
          <svg width={width * 0.9} height={height * 0.9} viewBox={`${minX} ${minY} ${width} ${height}`}>
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" className="fill-zinc-400" />
              </marker>
            </defs>
            {model.edges.map((e, i) => {
              const a = byName.get(e.from);
              const b = byName.get(e.to);
              if (!a || !b) return null;
              const x1 = a.x + NODE_W / 2, y1 = a.y + NODE_H;
              const x2 = b.x + NODE_W / 2, y2 = b.y;
              const midY = (y1 + y2) / 2;
              return (
                <g key={i}>
                  <path
                    d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                    fill="none"
                    strokeWidth={e.status === "unchanged" ? 1.5 : 2.5}
                    strokeDasharray={e.status === "removed" ? "5 4" : undefined}
                    className={edgeColor[e.status]}
                    markerEnd="url(#arrow)"
                  />
                  {e.label && (
                    <text x={(x1 + x2) / 2} y={midY - 4} textAnchor="middle" className="fill-zinc-400 text-[10px]">
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}
            {model.nodes.map((n) => (
              <g key={n.name} opacity={n.status === "removed" ? 0.6 : 1}>
                <rect
                  x={n.x} y={n.y} width={NODE_W} height={NODE_H} rx={10}
                  strokeWidth={focus === n.name ? 3 : n.status === "unchanged" ? 1 : 2}
                  strokeDasharray={n.status === "removed" ? "6 4" : undefined}
                  className={`${statusStyle[n.status].box} ${focus === n.name ? "stroke-indigo-500" : ""}`}
                />
                <text x={n.x + NODE_W / 2} y={n.y + 21} textAnchor="middle" className={`text-[12px] font-semibold ${statusStyle[n.status].text}`}>
                  {n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label}
                </text>
                <text x={n.x + NODE_W / 2} y={n.y + 38} textAnchor="middle" className="fill-zinc-400 text-[10px]">
                  {kindLabel(n.kind)}
                  {statusStyle[n.status].badge && ` · ${statusStyle[n.status].badge}`}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
