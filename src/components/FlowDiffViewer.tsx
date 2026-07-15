"use client";
import { useMemo, useState } from "react";
import type { FlowDiffModel, FlowNodeStatus } from "@/lib/flow-diff";
import { kindLabel } from "@/lib/flow-diff";

const NODE_W = 168;
const NODE_H = 52;

// Explicit SVG colors — Tailwind utility classes on SVG shapes proved unreliable
// across build modes (an unstyled <rect> renders BLACK); attributes can't purge.
const PALETTE: Record<FlowNodeStatus, { fill: string; stroke: string; text: string; badge: string; dot: string }> = {
  added: { fill: "#ecfdf5", stroke: "#10b981", text: "#065f46", badge: "New", dot: "#10b981" },
  changed: { fill: "#fffbeb", stroke: "#f59e0b", text: "#92400e", badge: "Changed", dot: "#f59e0b" },
  removed: { fill: "#fef2f2", stroke: "#f87171", text: "#991b1b", badge: "Removed", dot: "#f87171" },
  unchanged: { fill: "#ffffff", stroke: "#d4d4d8", text: "#3f3f46", badge: "", dot: "#d4d4d8" },
};

function Dot({ status }: { status: FlowNodeStatus }) {
  return (
    <span
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: PALETTE[status].dot }}
    />
  );
}

function Legend() {
  const items: [FlowNodeStatus, string][] = [
    ["added", "New"],
    ["changed", "Changed"],
    ["removed", "Removed"],
    ["unchanged", "Unchanged"],
  ];
  return (
    <div className="flex gap-3 text-[11px] text-zinc-500">
      {items.map(([s, label]) => (
        <span key={s} className="flex items-center gap-1">
          <Dot status={s} /> {label}
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
                <span className="mr-1 inline-block align-middle"><Dot status={n.status} /></span>
                <span className="font-medium">{n.label}</span>
                <span className="block pl-3 text-[10px] text-zinc-400">
                  {kindLabel(n.kind)} · {PALETTE[n.status].badge}
                </span>
              </button>
            ))}
          {model.logicChanges.map((l) => (
            <div
              key={l.name}
              className="block w-full rounded-lg border border-dashed border-zinc-200 px-2 py-1 text-left text-xs dark:border-zinc-700"
            >
              <span className="mr-1 inline-block align-middle"><Dot status={l.status} /></span>
              <span className="font-medium">{l.name}</span>
              <span className="block pl-3 text-[10px] text-zinc-400">{l.kind} (logic)</span>
            </div>
          ))}
          {changedCount === 0 && model.logicChanges.length === 0 && (
            <p className="text-xs text-zinc-400">Identical in both stages.</p>
          )}
        </div>

        {/* Canvas — always light for diagram contrast */}
        <div className="grow overflow-auto rounded-lg border border-zinc-200 bg-white dark:border-zinc-700" style={{ maxHeight: 420 }}>
          <svg width={width * 0.9} height={height * 0.9} viewBox={`${minX} ${minY} ${width} ${height}`}>
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M0,0 L8,4 L0,8 z" fill="#a1a1aa" />
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
                    stroke={PALETTE[e.status].stroke}
                    strokeWidth={e.status === "unchanged" ? 1.5 : 2.5}
                    strokeDasharray={e.status === "removed" ? "5 4" : undefined}
                    markerEnd="url(#arrow)"
                  />
                  {e.label && (
                    <text x={(x1 + x2) / 2} y={midY - 4} textAnchor="middle" fontSize={10} fill="#a1a1aa">
                      {e.label}
                    </text>
                  )}
                </g>
              );
            })}
            {model.nodes.map((n) => (
              <g key={n.name} opacity={n.status === "removed" ? 0.65 : 1}>
                <rect
                  x={n.x} y={n.y} width={NODE_W} height={NODE_H} rx={10}
                  fill={PALETTE[n.status].fill}
                  stroke={focus === n.name ? "#6366f1" : PALETTE[n.status].stroke}
                  strokeWidth={focus === n.name ? 3 : n.status === "unchanged" ? 1 : 2}
                  strokeDasharray={n.status === "removed" ? "6 4" : undefined}
                />
                <text x={n.x + NODE_W / 2} y={n.y + 21} textAnchor="middle" fontSize={12} fontWeight={600} fill={PALETTE[n.status].text}>
                  {n.label.length > 22 ? n.label.slice(0, 21) + "…" : n.label}
                </text>
                <text x={n.x + NODE_W / 2} y={n.y + 38} textAnchor="middle" fontSize={10} fill="#a1a1aa">
                  {kindLabel(n.kind)}
                  {PALETTE[n.status].badge && ` · ${PALETTE[n.status].badge}`}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
