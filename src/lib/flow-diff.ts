/**
 * Salesforce Flow visual diff (Gearset-style): parse two versions of a
 * *.flow-meta.xml, match canvas elements by API name, classify each as
 * added / removed / changed / unchanged, and carry the Flow Builder
 * coordinates (locationX/locationY) every element stores — so the UI can
 * render a faithful diagram with no layout engine.
 */
import { XMLParser } from "fast-xml-parser";

export type FlowNodeStatus = "added" | "removed" | "changed" | "unchanged";

export interface FlowNode {
  name: string;
  label: string;
  kind: string; // screens, decisions, assignments, recordUpdates, …
  x: number;
  y: number;
  status: FlowNodeStatus;
}

export interface FlowEdge {
  from: string;
  to: string;
  label?: string; // decision rule / fault / scheduled path
  status: FlowNodeStatus;
}

export interface FlowDiffModel {
  flowLabel: string;
  statusBase: string | null; // Active / Draft in target
  statusHead: string | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  /** Non-canvas changes (variables, formulas, constants…): name → status. */
  logicChanges: { name: string; kind: string; status: FlowNodeStatus }[];
  /** Start card header, e.g. { title: "Record-Triggered Flow", caption: "Tickets — created or updated" } */
  startInfo?: { title: string; caption: string };
}

const CANVAS_KINDS = [
  "screens", "decisions", "assignments", "recordCreates", "recordUpdates",
  "recordLookups", "recordDeletes", "actionCalls", "loops", "subflows",
  "waits", "collectionProcessors", "transforms", "customErrors",
];
const LOGIC_KINDS = ["variables", "formulas", "constants", "textTemplates", "choices"];

const KIND_LABEL: Record<string, string> = {
  screens: "Screen", decisions: "Decision", assignments: "Assignment",
  recordCreates: "Create Records", recordUpdates: "Update Records",
  recordLookups: "Get Records", recordDeletes: "Delete Records",
  actionCalls: "Action", loops: "Loop", subflows: "Subflow", waits: "Wait",
  collectionProcessors: "Collection", transforms: "Transform",
  customErrors: "Custom Error", start: "Start", end: "End",
};
export const kindLabel = (k: string) => KIND_LABEL[k] ?? k;

const parser = new XMLParser({
  ignoreAttributes: true,
  isArray: (name) =>
    [...CANVAS_KINDS, ...LOGIC_KINDS, "rules", "scheduledPaths", "connectors"].includes(name),
});

interface RawElement {
  name?: string;
  label?: string;
  locationX?: number;
  locationY?: number;
  connector?: { targetReference?: string } | { targetReference?: string }[];
  defaultConnector?: { targetReference?: string };
  defaultConnectorLabel?: string;
  faultConnector?: { targetReference?: string };
  nextValueConnector?: { targetReference?: string };
  noMoreValuesConnector?: { targetReference?: string };
  rules?: { name?: string; label?: string; connector?: { targetReference?: string } }[];
  scheduledPaths?: { name?: string; label?: string; connector?: { targetReference?: string } }[];
  [key: string]: unknown;
}

interface StartMeta {
  object?: string;
  triggerType?: string;
  recordTriggerType?: string;
  processType?: string;
  hasScreens: boolean;
}

interface ParsedFlow {
  label: string;
  status: string | null;
  elements: Map<string, { kind: string; el: RawElement }>;
  logic: Map<string, { kind: string; el: unknown }>;
  edges: { from: string; to: string; label?: string }[];
  startMeta: StartMeta;
}

function deriveStartInfo(m: StartMeta): { title: string; caption: string } {
  const trigger =
    m.recordTriggerType === "Create" ? "a record is created"
    : m.recordTriggerType === "Update" ? "a record is updated"
    : m.recordTriggerType === "CreateAndUpdate" ? "a record is created or updated"
    : m.recordTriggerType === "Delete" ? "a record is deleted"
    : null;
  if (trigger || m.triggerType?.startsWith("Record")) {
    return { title: "Record-Triggered Flow", caption: [m.object, trigger].filter(Boolean).join(" — ") };
  }
  if (m.triggerType === "PlatformEvent") return { title: "Platform Event—Triggered Flow", caption: m.object ?? "" };
  if (m.triggerType === "Scheduled") return { title: "Schedule-Triggered Flow", caption: m.object ?? "" };
  if (m.hasScreens || m.processType === "Flow") return { title: "Screen Flow", caption: "" };
  return { title: "Autolaunched Flow", caption: "" };
}

function connectorTargets(el: RawElement, from: string): { from: string; to: string; label?: string }[] {
  const out: { from: string; to: string; label?: string }[] = [];
  const push = (c: { targetReference?: string } | undefined, label?: string) => {
    if (c?.targetReference) out.push({ from, to: c.targetReference, label });
  };
  const conns = Array.isArray(el.connector) ? el.connector : el.connector ? [el.connector] : [];
  for (const c of conns) push(c);
  push(el.defaultConnector, el.defaultConnectorLabel ?? "otherwise");
  push(el.faultConnector, "fault");
  push(el.nextValueConnector, "for each");
  push(el.noMoreValuesConnector, "after last");
  for (const r of el.rules ?? []) push(r.connector, r.label ?? r.name);
  for (const p of el.scheduledPaths ?? []) push(p.connector, p.label ?? p.name ?? "scheduled");
  return out;
}

export function parseFlow(xml: string): ParsedFlow {
  const root = parser.parse(xml)?.Flow ?? {};
  const elements = new Map<string, { kind: string; el: RawElement }>();
  const logic = new Map<string, { kind: string; el: unknown }>();
  const edges: { from: string; to: string; label?: string }[] = [];

  for (const kind of CANVAS_KINDS) {
    for (const el of (root[kind] ?? []) as RawElement[]) {
      if (!el?.name) continue;
      elements.set(el.name, { kind, el });
      edges.push(...connectorTargets(el, el.name));
    }
  }
  const startMeta: StartMeta = { hasScreens: (root.screens ?? []).length > 0 };
  if (root.start) {
    const start = root.start as RawElement & {
      object?: string;
      triggerType?: string;
      recordTriggerType?: string;
    };
    startMeta.object = start.object ? String(start.object) : undefined;
    startMeta.triggerType = start.triggerType ? String(start.triggerType) : undefined;
    startMeta.recordTriggerType = start.recordTriggerType ? String(start.recordTriggerType) : undefined;
    elements.set("__start__", {
      kind: "start",
      el: { ...start, name: "__start__", label: "Start" },
    });
    edges.push(...connectorTargets(start, "__start__"));
  }
  startMeta.processType = root.processType ? String(root.processType) : undefined;
  for (const kind of LOGIC_KINDS) {
    for (const el of (root[kind] ?? []) as RawElement[]) {
      if (el?.name) logic.set(el.name, { kind, el });
    }
  }
  return {
    label: String(root.label ?? "Flow"),
    status: root.status ? String(root.status) : null,
    elements,
    logic,
    edges,
    startMeta,
  };
}

/** Order-insensitive serialization so cosmetic key order never reads as a change. */
const stable = (v: unknown): string =>
  JSON.stringify(v, (_k, val) =>
    val && typeof val === "object" && !Array.isArray(val)
      ? Object.fromEntries(Object.entries(val).sort(([a], [b]) => a.localeCompare(b)))
      : val
  );

export function diffFlows(baseXml: string | null, headXml: string | null): FlowDiffModel {
  const base = baseXml ? parseFlow(baseXml) : null;
  const head = headXml ? parseFlow(headXml) : null;
  const nodes: FlowNode[] = [];
  const names = new Set([...(base?.elements.keys() ?? []), ...(head?.elements.keys() ?? [])]);

  for (const name of names) {
    const b = base?.elements.get(name);
    const h = head?.elements.get(name);
    const src = h ?? b!;
    const status: FlowNodeStatus = !b ? "added" : !h ? "removed" : stable(b.el) === stable(h.el) ? "unchanged" : "changed";
    nodes.push({
      name,
      label: String(src.el.label ?? name),
      kind: src.kind,
      x: Number(src.el.locationX ?? 0),
      y: Number(src.el.locationY ?? 0),
      status,
    });
  }

  const edgeKey = (e: { from: string; to: string; label?: string }) => `${e.from}→${e.to}:${e.label ?? ""}`;
  const baseEdges = new Map((base?.edges ?? []).map((e) => [edgeKey(e), e]));
  const headEdges = new Map((head?.edges ?? []).map((e) => [edgeKey(e), e]));
  const edges: FlowEdge[] = [];
  for (const [k, e] of headEdges) edges.push({ ...e, status: baseEdges.has(k) ? "unchanged" : "added" });
  for (const [k, e] of baseEdges) if (!headEdges.has(k)) edges.push({ ...e, status: "removed" });

  const logicChanges: FlowDiffModel["logicChanges"] = [];
  const logicNames = new Set([...(base?.logic.keys() ?? []), ...(head?.logic.keys() ?? [])]);
  for (const name of logicNames) {
    const b = base?.logic.get(name);
    const h = head?.logic.get(name);
    const status: FlowNodeStatus = !b ? "added" : !h ? "removed" : stable(b.el) === stable(h.el) ? "unchanged" : "changed";
    if (status !== "unchanged") logicChanges.push({ name, kind: (h ?? b)!.kind, status });
  }

  const meta = (head ?? base)?.startMeta;
  const startInfo = meta ? deriveStartInfo(meta) : undefined;

  // Flow Builder shows "Run Immediately" on the unlabeled path out of a
  // record-triggered Start (scheduled paths carry their own labels).
  if (meta?.recordTriggerType) {
    for (const e of edges) if (e.from === "__start__" && !e.label) e.label = "Run Immediately";
  }

  // Auto-layout flows (the Flow Builder default since '23) store dummy
  // coordinates — everything at 0,0. Detect, compute a layered layout, and cap
  // the canvas with Flow Builder's End card.
  const stacked = nodes.filter((n) => n.x === 0 && n.y === 0).length;
  if (nodes.length > 1 && stacked > nodes.length / 2) {
    autoLayout(nodes, edges);
    const leaves = nodes.filter((n) => !edges.some((e) => e.from === n.name && e.status !== "removed"));
    if (leaves.length) {
      const end: FlowNode = {
        name: "__end__",
        label: "End",
        kind: "end",
        x: leaves.reduce((s, n) => s + n.x, 0) / leaves.length,
        y: Math.max(...nodes.map((n) => n.y)) + 180,
        status: "unchanged",
      };
      nodes.push(end);
      for (const l of leaves) edges.push({ from: l.name, to: "__end__", status: "unchanged" });
    }
  }

  return {
    flowLabel: head?.label ?? base?.label ?? "Flow",
    statusBase: base?.status ?? null,
    statusHead: head?.status ?? null,
    nodes,
    edges,
    logicChanges,
    startInfo,
  };
}

/** Simple layered layout: BFS depth from Start → rows; siblings spread as columns. */
function autoLayout(nodes: FlowNode[], edges: FlowEdge[]): void {
  const children = new Map<string, string[]>();
  const hasIncoming = new Set<string>();
  for (const e of edges) {
    if (!children.has(e.from)) children.set(e.from, []);
    children.get(e.from)!.push(e.to);
    hasIncoming.add(e.to);
  }
  const roots = nodes.filter((n) => n.name === "__start__" || !hasIncoming.has(n.name));
  const depth = new Map<string, number>();
  const queue: [string, number][] = roots.map((r) => [r.name, 0]);
  while (queue.length) {
    const [name, d] = queue.shift()!;
    if (depth.has(name) && depth.get(name)! >= d) continue;
    depth.set(name, d);
    for (const c of children.get(name) ?? []) queue.push([c, d + 1]);
  }
  const rows = new Map<number, FlowNode[]>();
  for (const n of nodes) {
    const d = depth.get(n.name) ?? (Math.max(0, ...depth.values()) + 1);
    if (!rows.has(d)) rows.set(d, []);
    rows.get(d)!.push(n);
  }
  for (const [d, row] of rows) {
    row.forEach((n, i) => {
      n.x = (i - (row.length - 1) / 2) * 310 + 300; // card-width spacing
      n.y = d * 170;
    });
  }
}
