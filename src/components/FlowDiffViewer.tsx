"use client";
import { useMemo, useState } from "react";
import type { FlowDiffModel, FlowNodeStatus } from "@/lib/flow-diff";
import { kindLabel } from "@/lib/flow-diff";

/**
 * Flow Builder auto-layout card style: white cards with the type-colored icon
 * tile on the left, bold label + type caption, a vertical connector spine with
 * ⊕ junctions and pill path labels, and the red End cap. Diff status renders
 * as a colored ring + corner dot so Salesforce's palette stays authentic.
 * Explicit SVG attributes throughout (Tailwind on SVG proved unreliable).
 */

const CARD_W = 272;
const CARD_H = 64;
const TILE = 40;

const STATUS: Record<FlowNodeStatus, { color: string; badge: string }> = {
  added: { color: "#2E844A", badge: "New" },
  changed: { color: "#DD7A01", badge: "Changed" },
  removed: { color: "#BA0517", badge: "Removed" },
  unchanged: { color: "#C9C9C9", badge: "" },
};

const KIND: Record<string, { color: string; shape: "square" | "diamond" | "circle" }> = {
  start: { color: "#0B827C", shape: "circle" },
  end: { color: "#BA0517", shape: "circle" },
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

/** White glyphs echoing Flow Builder's icons, centered on (cx, cy). */
function Glyph({ kind, cx, cy }: { kind: string; cx: number; cy: number }) {
  const s = "#ffffff";
  switch (kind) {
    case "start":
      return <path d={`M ${cx - 5} ${cy - 8} L ${cx + 9} ${cy} L ${cx - 5} ${cy + 8} Z`} fill={s} />;
    case "end":
      return <rect x={cx - 6} y={cy - 6} width={12} height={12} rx={2.5} fill={s} />;
    case "decisions":
      return (
        <g stroke={s} strokeWidth={2.2} strokeLinecap="round">
          <line x1={cx - 6} y1={cy - 3.5} x2={cx + 6} y2={cy - 3.5} />
          <circle cx={cx + 2.5} cy={cy - 3.5} r={2.3} fill={s} stroke="none" />
          <line x1={cx - 6} y1={cy + 3.5} x2={cx + 6} y2={cy + 3.5} />
          <circle cx={cx - 2.5} cy={cy + 3.5} r={2.3} fill={s} stroke="none" />
        </g>
      );
    case "assignments":
      return (
        <g stroke={s} strokeWidth={2.2} strokeLinecap="round">
          <line x1={cx - 6.5} y1={cy - 3.5} x2={cx + 6.5} y2={cy - 3.5} />
          <line x1={cx - 6.5} y1={cy + 3.5} x2={cx + 6.5} y2={cy + 3.5} />
        </g>
      );
    case "recordCreates":
    case "recordUpdates":
    case "recordLookups":
    case "recordDeletes": {
      const clipboard = (
        <g fill="none" stroke={s} strokeWidth={1.8}>
          <rect x={cx - 7} y={cy - 7.5} width={14} height={16} rx={2} />
          <rect x={cx - 3.5} y={cy - 10} width={7} height={4.5} rx={1.2} fill={s} stroke="none" />
        </g>
      );
      const marker =
        kind === "recordCreates" ? (
          <g stroke={s} strokeWidth={2} strokeLinecap="round">
            <line x1={cx - 3} y1={cy + 1} x2={cx + 3} y2={cy + 1} />
            <line x1={cx} y1={cy - 2} x2={cx} y2={cy + 4} />
          </g>
        ) : kind === "recordUpdates" ? (
          <path d={`M ${cx - 3} ${cy + 4} L ${cx - 2.2} ${cy + 1} L ${cx + 3} ${cy - 4.2} L ${cx + 4.4} ${cy - 2.8} L ${cx - 1} ${cy + 2.4} Z`} fill={s} />
        ) : kind === "recordLookups" ? (
          <g fill="none" stroke={s} strokeWidth={1.8}>
            <circle cx={cx - 1} cy={cy} r={2.8} />
            <line x1={cx + 1.2} y1={cy + 2.2} x2={cx + 4} y2={cy + 5} strokeLinecap="round" />
          </g>
        ) : (
          <g stroke={s} strokeWidth={2} strokeLinecap="round">
            <line x1={cx - 2.6} y1={cy - 1.2} x2={cx + 2.6} y2={cy + 4} />
            <line x1={cx + 2.6} y1={cy - 1.2} x2={cx - 2.6} y2={cy + 4} />
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
      return <path d={`M ${cx + 2} ${cy - 8.5} L ${cx - 6} ${cy + 1.5} L ${cx - 1} ${cy + 1.5} L ${cx - 2} ${cy + 8.5} L ${cx + 6} ${cy - 1.5} L ${cx + 1} ${cy - 1.5} Z`} fill={s} />;
    case "loops":
      return (
        <g fill="none" stroke={s} strokeWidth={2.2} strokeLinecap="round">
          <path d={`M ${cx + 6} ${cy - 2.5} A 6.3 6.3 0 1 0 ${cx + 6} ${cy + 3.5}`} />
          <path d={`M ${cx + 2.6} ${cy - 6} L ${cx + 6.8} ${cy - 2.5} L ${cx + 2.6} ${cy + 0.8}`} fill={s} stroke="none" />
        </g>
      );
    case "screens":
      return (
        <g fill="none" stroke={s} strokeWidth={1.8}>
          <rect x={cx - 7.5} y={cy - 6.5} width={15} height={11} rx={1.8} />
          <line x1={cx - 3.5} y1={cy + 7.5} x2={cx + 3.5} y2={cy + 7.5} strokeLinecap="round" />
        </g>
      );
    default:
      return <circle cx={cx} cy={cy} r={3.5} fill={s} />;
  }
}

function IconTile({ kind, x, y }: { kind: string; x: number; y: number }) {
  const { color, shape } = kindStyle(kind);
  const cx = x + TILE / 2;
  const cy = y + TILE / 2;
  const half = TILE / 2;
  const body =
    shape === "circle" ? (
      <circle cx={cx} cy={cy} r={half - 2} fill={color} />
    ) : shape === "diamond" ? (
      <rect x={cx - half + 6} y={cy - half + 6} width={TILE - 12} height={TILE - 12} rx={5} fill={color} transform={`rotate(45 ${cx} ${cy})`} />
    ) : (
      <rect x={x} y={y} width={TILE} height={TILE} rx={9} fill={color} />
    );
  return (
    <g>
      {body}
      <Glyph kind={kind} cx={cx} cy={cy} />
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

const trunc = (t: string, n: number) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

export function FlowDiffViewer({ model }: { model: FlowDiffModel }) {
  const [focus, setFocus] = useState<string | null>(null);
  const byName = useMemo(() => new Map(model.nodes.map((n) => [n.name, n])), [model.nodes]);

  const { minX, minY, width, height } = useMemo(() => {
    const xs = model.nodes.length ? model.nodes.map((n) => n.x) : [0];
    const ys = model.nodes.length ? model.nodes.map((n) => n.y) : [0];
    const minX = Math.min(...xs) - 40;
    const minY = Math.min(...ys) - 30;
    return {
      minX,
      minY,
      width: Math.max(...xs) - minX + CARD_W + 80,
      height: Math.max(...ys) - minY + CARD_H + 50,
    };
  }, [model.nodes]);

  const changedCount = model.nodes.filter((n) => n.status !== "unchanged").length;

  const cardText = (n: { name: string; label: string; kind: string }) => {
    if (n.kind === "start") {
      const caption = ["Start", model.startInfo?.caption].filter(Boolean).join(" · ");
      return { title: model.startInfo?.title ?? "Start", caption };
    }
    if (n.kind === "end") return { title: "End", caption: "" };
    return { title: n.label, caption: kindLabel(n.kind) };
  };

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
        <div className="w-48 shrink-0 space-y-1 overflow-auto" style={{ maxHeight: 460 }}>
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
        <div className="grow overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-700" style={{ maxHeight: 460, background: "#fafaf9" }}>
          <svg width={width * 0.95} height={height * 0.95} viewBox={`${minX} ${minY} ${width} ${height}`}>
            <defs>
              <pattern id="flowdots" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.1" fill="#e4e4e7" />
              </pattern>
            </defs>
            <rect x={minX} y={minY} width={width} height={height} fill="url(#flowdots)" />

            {model.edges.map((e, i) => {
              const a = byName.get(e.from);
              const b = byName.get(e.to);
              if (!a || !b) return null;
              const x1 = a.x + CARD_W / 2, y1 = a.y + CARD_H;
              const x2 = b.x + CARD_W / 2, y2 = b.y;
              const midY = (y1 + y2) / 2;
              const stroke = e.status === "unchanged" ? "#747474" : STATUS[e.status].color;
              const d =
                x1 === x2
                  ? `M ${x1} ${y1} L ${x2} ${y2}`
                  : `M ${x1} ${y1} L ${x1} ${midY - 24} Q ${x1} ${midY - 8} ${x1 + Math.sign(x2 - x1) * 16} ${midY - 8} L ${x2 - Math.sign(x2 - x1) * 16} ${midY - 8} Q ${x2} ${midY - 8} ${x2} ${midY + 8} L ${x2} ${y2}`;
              const junctionX = x1 === x2 ? x1 : x2;
              const junctionY = x1 === x2 ? midY + 12 : (midY + 8 + y2) / 2 + 6;
              return (
                <g key={i}>
                  <path d={d} fill="none" stroke={stroke} strokeWidth={e.status === "unchanged" ? 1.5 : 2.5}
                    strokeDasharray={e.status === "removed" ? "5 4" : undefined} />
                  {/* Flow Builder's ⊕ junction on the connector */}
                  <circle cx={junctionX} cy={junctionY} r={9} fill="#ffffff" stroke={stroke} strokeWidth={1.5} />
                  <g stroke={stroke} strokeWidth={1.6} strokeLinecap="round">
                    <line x1={junctionX - 4} y1={junctionY} x2={junctionX + 4} y2={junctionY} />
                    <line x1={junctionX} y1={junctionY - 4} x2={junctionX} y2={junctionY + 4} />
                  </g>
                  {e.label && (
                    <g>
                      <rect x={x1 - e.label.length * 3.4 - 8} y={y1 + 8} width={e.label.length * 6.8 + 16} height={19} rx={9.5} fill="#ffffff" stroke="#c9c9c9" />
                      <text x={x1} y={y1 + 21} textAnchor="middle" fontSize={11} fontWeight={600} fill="#444444">
                        {e.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {model.nodes.map((n) => {
              const { title, caption } = cardText(n);
              const ring = focus === n.name ? "#6366f1" : STATUS[n.status].color;
              const showRing = focus === n.name || n.status !== "unchanged";
              return (
                <g key={n.name} opacity={n.status === "removed" ? 0.6 : 1} onClick={() => setFocus(n.name === focus ? null : n.name)} style={{ cursor: "pointer" }}>
                  {showRing && (
                    <rect x={n.x - 3} y={n.y - 3} width={CARD_W + 6} height={CARD_H + 6} rx={13}
                      fill="none" stroke={ring} strokeWidth={2.5}
                      strokeDasharray={n.status === "removed" ? "6 4" : undefined} />
                  )}
                  <rect x={n.x} y={n.y} width={CARD_W} height={CARD_H} rx={10} fill="#ffffff" stroke="#dddbda" strokeWidth={1} />
                  <IconTile kind={n.kind} x={n.x + 12} y={n.y + 12} />
                  <text x={n.x + 64} y={n.y + 28} fontSize={13} fontWeight={700} fill="#181818">
                    {trunc(title, 28)}
                  </text>
                  {caption && (
                    <text x={n.x + 64} y={n.y + 46} fontSize={11} fill="#706E6B">
                      {trunc(caption, 34)}
                    </text>
                  )}
                  {n.status !== "unchanged" && (
                    <circle cx={n.x + CARD_W - 2} cy={n.y + 2} r={5.5} fill={STATUS[n.status].color} stroke="#ffffff" strokeWidth={1.5} />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
