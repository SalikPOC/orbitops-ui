/**
 * Turns force-app file paths into plain-language lines for citizen developers.
 * Path-convention based (no XML parsing) — good enough to orient a non-developer.
 */
export interface FileChange {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed" | string;
  patch?: string;
}

const STATUS_WORD: Record<string, string> = {
  added: "added",
  removed: "removed",
  modified: "changed",
  renamed: "moved",
};

const de = (s: string) => s.replace(/__c$/, "").replace(/_/g, " ");

export function summarizeMetadataPath(filename: string, status: string): string {
  const verb = STATUS_WORD[status] ?? status;
  const m = filename.match(/force-app\/[^/]+\/[^/]+\/(.+)$/);
  if (!m) return `${filename} — ${verb}`;
  const rel = m[1];
  const seg = rel.split("/");

  if (seg[0] === "objects") {
    const object = de(seg[1]);
    if (seg[2] === "fields") return `Field “${de(seg[3].replace(".field-meta.xml", ""))}” on ${object} — ${verb}`;
    if (seg[2] === "validationRules")
      return `Validation rule “${de(seg[3].replace(".validationRule-meta.xml", ""))}” on ${object} — ${verb}`;
    if (seg[2] === "listViews") return `List view “${de(seg[3].replace(".listView-meta.xml", ""))}” on ${object} — ${verb}`;
    if (seg[2] === "recordTypes")
      return `Record type “${de(seg[3].replace(".recordType-meta.xml", ""))}” on ${object} — ${verb}`;
    if (seg.length === 3 && seg[2].endsWith(".object-meta.xml")) return `Object “${object}” — ${verb}`;
    return `${object}: ${seg.slice(2).join("/")} — ${verb}`;
  }
  if (seg[0] === "classes") return `Apex class “${seg[1].replace(/\.cls(-meta\.xml)?$/, "")}” — ${verb}`;
  if (seg[0] === "triggers") return `Apex trigger “${seg[1].replace(/\.trigger(-meta\.xml)?$/, "")}” — ${verb}`;
  if (seg[0] === "flows") return `Flow “${de(seg[1].replace(".flow-meta.xml", ""))}” — ${verb}`;
  if (seg[0] === "layouts") return `Page layout “${decodeURIComponent(seg[1].replace(".layout-meta.xml", ""))}” — ${verb}`;
  if (seg[0] === "permissionsets")
    return `Permission set “${de(seg[1].replace(".permissionset-meta.xml", ""))}” — ${verb}`;
  if (seg[0] === "flexipages") return `Lightning page “${de(seg[1].replace(".flexipage-meta.xml", ""))}” — ${verb}`;
  if (seg[0] === "tabs") return `Tab “${de(seg[1].replace(".tab-meta.xml", ""))}” — ${verb}`;
  return `${rel} — ${verb}`;
}
