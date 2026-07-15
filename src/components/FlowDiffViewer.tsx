"use client";
import { useMemo, useState } from "react";
import type { FlowDiffModel, FlowNodeStatus } from "@/lib/flow-diff";
import { kindLabel } from "@/lib/flow-diff";

/**
 * Flow-Builder-styled diff canvas: type-colored icon tiles (diamond decisions,
 * green Start circle, pink data ops…), labels beneath, straight auto-layout
 * connectors, dotted canvas. Diff status renders as a halo + corner dot so the
 * Salesforce type colors stay authentic. Explicit SVG attributes throughout.
 */

const CELL_W = 168; // logical grid cell (layout coordinates are top-left based)
const ICON = 48;
const NODE_TOTAL_H = 112; // icon + type line + up to two label lines

/** Wrap an element label into at most two ~22-char lines (Flow Builder style). */
function wrapLabel(t: string): string[] {
  if (t.length <= 22) return [t];
  const words = t.split(" ");
  let first = "";
  while (words.length && (first ? first + " " + words[0] : words[0]).length <= 22) {
    first = first ? `${first} ${words.shift()}` : (words.shift() as string);
  }
  if (!first) return [t.slice(0, 22), t.slice(22, 43) + (t.length > 43 ? "…" : "")];
  let rest = words.join(" ");
  if (rest.length > 22) rest = rest.slice(0, 21) + "…";
  return rest ? [first, rest] : [first];
}

// Status (diff) colors — halo, corner dot, sidebar.
const STATUS: Record<FlowNodeStatus, { color: string; badge: string }> = {
  added: { color: "#2E844A", badge: "New" },
  changed: { color: "#DD7A01", badge: "Changed" },
  removed: { color: "#BA0517", badge: "Removed" },
  unchanged: { color: "#C9C9C9", badge: "" },
};

// Salesforce Flow Builder element styling per kind.
const KIND: Record<string, { color: string; shape: "square" | "diamond" | "circle" }> = {
  start: { color: "#0B827C", shape: "circle" },
  screens: { color: "#1B96FF", shape: "square" },
  decisions: { color: "#DD7A01", shape: "diamond" },
  assignments: { color: "#DD7A01", shape: "square" },
  recordCreates: { color: "#FF538A", shape: "square" },
  recordUpdates: { color: "#FF538A", shape: "square" },
  recordLookups: { color: "#FF538A", shape: "square" },
  recordDeletes: { color: "#FF538A", shape: "square" },
  actionCalls: { color: "#0B5CAB", shape: "square" },
  subflows: { color: "#032D60", shape: "square" },
  loops: { color: "#DD7A01", shape: "circle" },
  waits: { color: "#706E6B", shape: "square" },
  collectionProcessors: { color: "#DD7A01", shape: "square" },
  transforms: { color: "#DD7A01", shape: "square" },
  customErrors: { color: "#BA0517", shape: "square" },
};
const kindStyle = (k: string) => KIND[k] ?? { color: "#706E6B", shape: "square" as const };

/** Minimal white glyphs echoing Flow Builder's icons. cx/cy = icon center. */
function Glyph({ kind, cx, cy }: { kind: string; cx: number; cy: number }) {
  const s = "#ffffff";
  switch (kind) {
    case "start":
      return <path d={`M ${cx - 6} ${cy - 9} L ${cx + 10} ${cy} L ${cx - 6} ${cy + 9} Z`} fill={s} />;
    case "decisions":
      // Flow Builder's "slider" decision glyph: bars with offset knobs.
      return (
        <g stroke={s} strokeWidth={2.5} strokeLinecap="round">
          <line x1={cx - 7} y1={cy - 4} x2={cx + 7} y2={cy - 4} />
          <circle cx={cx + 3} cy={cy - 4} r={2.6} fill={s} stroke="none" />
          <line x1={cx - 7} y1={cy + 4} x2={cx + 7} y2={cy + 4} />
          <circle cx={cx - 3} cy={cy + 4} r={2.6} fill={s} stroke="none" />
        </g>
      );
    case "assignments":
      return (
        <g stroke={s} strokeWidth={2.5} strokeLinecap="round">
          <line x1={cx - 8} y1={cy - 4} x2={cx + 8} y2={cy - 4} />
          <line x1={cx - 8} y1={cy + 4} x2={cx + 8} y2={cy + 4} />
        </g>
      );
    case "recordCreates":
    case "recordUpdates":
    case "recordLookups":
    case "recordDeletes": {
      // Flow Builder's clipboard glyph with a per-operation marker.
      const clipboard = (
        <g fill="none" stroke={s} strokeWidth={2}>
          <rect x={cx - 8} y={cy - 9} width={16} height={19} rx={2.5} />
          <rect x={cx - 4} y={cy - 12} width={8} height={5} rx={1.5} fill={s} stroke="none" />
        </g>
      );
      const marker =
        kind === "recordCreates" ? (
          <g stroke={s} strokeWidth={2.2} strokeLinecap="round">
            <line x1={cx - 3.5} y1={cy + 1.5} x2={cx + 3.5} y2={cy + 1.5} />
            <line x1={cx} y1={cy - 2} x2={cx} y2={cy + 5} />
          </g>
        ) : kind === "recordUpdates" ? (
          <path d={`M ${cx - 3.5} ${cy + 4.5} L ${cx - 2.5} ${cy + 1} L ${cx + 3.5} ${cy - 5} L ${cx + 5} ${cy - 3.5} L ${cx - 1} ${cy + 2.5} Z`} fill={s} />
        ) : kind === "recordLookups" ? (
          <g fill="none" stroke={s} strokeWidth={2}>
            <circle cx={cx - 1} cy={cy} r={3.2} />
            <line x1={cx + 1.5} y1={cy + 2.5} x2={cx + 4.5} y2={cy + 5.5} strokeLinecap="round" />
          </g>
        ) : (
          <g stroke={s} strokeWidth={2.2} strokeLinecap="round">
            <line x1={cx - 3} y1={cy - 1.5} x2={cx + 3} y2={cy + 4.5} />
            <line x1={cx + 3} y1={cy - 1.5} x2={cx - 3} y2={cy + 4.5} />
          </g>
        );
      return (
        <g>
          {clipboard}
          {marker}
        </g>
      );
    }
    case "actionCalls":
    case "subflows":
      return <path d={`M ${cx + 2} ${cy - 10} L ${cx - 7} ${cy + 2} L ${cx - 1} ${cy + 2} L ${cx - 2} ${cy + 10} L ${cx + 7} ${cy - 2} L ${cx + 1} ${cy - 2} Z`} fill={s} />;
    case "loops":
      return (
        <g fill="none" stroke={s} strokeWidth={2.5} strokeLinecap="round">
          <path d={`M ${cx + 7} ${cy - 3} A 7.5 7.5 0 1 0 ${cx + 7} ${cy + 4}`} />
          <path d={`M ${cx + 3} ${cy - 7} L ${cx + 8} ${cy - 3} L ${cx + 3} ${cy + 1}`} fill={s} stroke="none" />
        </g>
      );
    case "screens":
      return (
        <g fill="none" stroke={s} strokeWidth={2}>
          <rect x={cx - 9} y={cy - 8} width={18} height={13} rx={2} />
          <line x1={cx - 4} y1={cy + 9} x2={cx + 4} y2={cy + 9} strokeLinecap="round" />
        </g>
      );
    default:
      return <circle cx={cx} cy={cy} r={4} fill={s} />;
  }
}

function IconTile({ kind, x, y, status, focused }: {
  kind: string; x: number; y: number; status: FlowNodeStatus; focused: boolean;
}) {
  const { color, shape } = kindStyle(kind);
  const cx = x + CELL_W / 2;
  const cy = y + ICON / 2;
  const half = ICON / 2;
  const haloColor = focused ? "#6366f1" : STATUS[status].color;
  const showHalo = focused || status !== "unchanged";
  const dash = status === "removed" ? "5 4" : undefined;

  const body =
    shape === "circle" ? (
      <circle cx={cx} cy={cy} r={half - 4} fill={color} />
    ) : shape === "diamond" ? (
      <rect x={cx - half + 7} y={cy - half + 7} width={ICON - 14} height={ICON - 14} rx={6} fill={color} transform={`rotate(45 ${cx} ${cy})`} />
    ) : (
      <rect x={cx - half + 4} y={cy - half + 4} width={ICON - 8} height={ICON - 8} rx={10} fill={color} />
    );

  const halo =
    shape === "circle" ? (
      <circle cx={cx} cy={cy} r={half + 1} fill="none" stroke={haloColor} strokeWidth={2.5} strokeDasharray={dash} />
    ) : shape === "diamond" ? (
      <rect x={cx - half + 2} y={cy - half + 2} width={ICON - 4} height={ICON - 4} rx={8} fill="none" stroke={haloColor} strokeWidth={2.5} strokeDasharray={dash} transform={`rotate(45 ${cx} ${cy})`} />
    ) : (
      <rect x={cx - half - 1} y={cy - half - 1} width={ICON + 2} height={ICON + 2} rx={12} fill="none" stroke={haloColor} strokeWidth={2.5} strokeDasharray={dash} />
    );

  return (
    <g>
      {showHalo && halo}
      {body}
      <Glyph kind={kind} cx={cx} cy={cy} />
      {status !== "unchanged" && (
        <circle cx={cx + half + 2} cy={cy - half + 2} r={5} fill={STATUS[status].color} stroke="#ffffff" strokeWidth={1.5} />
      )}
    </g>
  );
}

function Dot({ status }: { status: FlowNodeStatus }) {
  return <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: STATUS[status].color }} />;
}

function Legend() {
  const items: FlowNodeStatus[] = ["added", "changed", "removed"];
  return (
    <div className="flex gap-3 text-[11px] text-zinc-500">
      {items.map((s) => (
        <span key={s} className="flex items-center gap-1">
          <Dot status={s} /> {STATUS[s].badge}
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
    const minX = Math.min(...xs, 0) - 50;
    const minY = Math.min(...ys, 0) - 30;
    return {
      minX,
      minY,
      width: Math.max(...xs, 200) - minX + CELL_W + 100,
      height: Math.max(...ys, 150) - minY + NODE_TOTAL_H + 60,
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
        <div className="w-48 shrink-0 space-y-1 overflow-auto" style={{ maxHeight: 440 }}>
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
                  {kindLabel(n.kind)} · {STATUS[n.status].badge}
                </span>
              </button>
            ))}
          {model.logicChanges.map((l) => (
            <div key={l.name} className="block w-full rounded-lg border border-dashed border-zinc-200 px-2 py-1 text-left text-xs dark:border-zinc-700">
              <span className="mr-1 inline-block align-middle"><Dot status={l.status} /></span>
              <span className="font-medium">{l.name}</span>
              <span className="block pl-3 text-[10px] text-zinc-400">{l.kind} (logic)</span>
            </div>
          ))}
          {changedCount === 0 && model.logicChanges.length === 0 && (
            <p className="text-xs text-zinc-400">Identical in both stages.</p>
          )}
        </div>

        {/* Canvas — Flow Builder dotted background, always light */}
        <div className="grow overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700" style={{ maxHeight: 440, background: "#ffffff" }}>
          <svg width={width * 0.95} height={height * 0.95} viewBox={`${minX} ${minY} ${width} ${height}`}>
            <defs>
              <pattern id="flowdots" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.2" fill="#e4e4e7" />
              </pattern>
              <marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto">
                <path d="M0,0 L9,4.5 L0,9 z" fill="#939393" />
              </marker>
            </defs>
            <rect x={minX} y={minY} width={width} height={height} fill="url(#flowdots)" />

            {model.edges.map((e, i) => {
              const a = byName.get(e.from);
              const b = byName.get(e.to);
              if (!a || !b) return null;
              // Depart below the label block (icon + two text lines), arrive at icon top.
              const x1 = a.x + CELL_W / 2, y1 = a.y + ICON + 56;
              const x2 = b.x + CELL_W / 2, y2 = b.y - 6;
              const stroke = e.status === "unchanged" ? "#939393" : STATUS[e.status].color;
              const d =
                x1 === x2
                  ? `M ${x1} ${y1} L ${x2} ${y2}` // straight, Flow-Builder auto-layout style
                  : `M ${x1} ${y1} L ${x1} ${(y1 + y2) / 2} L ${x2} ${(y1 + y2) / 2} L ${x2} ${y2}`;
              const branchy = a.kind === "decisions" || a.kind === "loops" || a.kind === "waits";
              return (
                <g key={i}>
                  <path d={d} fill="none" stroke={stroke} strokeWidth={e.status === "unchanged" ? 1.5 : 2.5}
                    strokeDasharray={e.status === "removed" ? "5 4" : undefined} markerEnd="url(#arrow)" />
                  {branchy && <circle cx={x1} cy={y1} r={4} fill="#ffffff" stroke={stroke} strokeWidth={1.5} />}
                  {e.label && (
                    <g>
                      <rect x={(x1 + x2) / 2 - e.label.length * 3.2 - 5} y={(y1 + y2) / 2 - 9} width={e.label.length * 6.4 + 10} height={16} rx={8} fill="#f4f4f5" stroke="#e4e4e7" />
                      <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 3} textAnchor="middle" fontSize={10} fill="#52525b">
                        {e.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {model.nodes.map((n) => (
              <g key={n.name} opacity={n.status === "removed" ? 0.6 : 1} onClick={() => setFocus(n.name === focus ? null : n.name)} style={{ cursor: "pointer" }}>
                <IconTile kind={n.kind} x={n.x} y={n.y} status={n.status} focused={focus === n.name} />
                {/* Flow Builder order: bold type name, element label beneath */}
                <text x={n.x + CELL_W / 2} y={n.y + ICON + 20} textAnchor="middle" fontSize={12.5} fontWeight={700} fill="#181818">
                  {kindLabel(n.kind)}
                </text>
                {wrapLabel(n.label).map((line, li) => (
                  <text key={li} x={n.x + CELL_W / 2} y={n.y + ICON + 35 + li * 13} textAnchor="middle" fontSize={11} fill="#444444">
                    {line}
                  </text>
                ))}
              </g>
            ))}
          </svg>
        </div>
      </div>
    </div>
  );
}
