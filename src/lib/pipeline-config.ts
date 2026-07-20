import "server-only";
import { dump, load } from "js-yaml";
import type { Stage } from "./types";

/**
 * Parse + regenerate .orbitops/pipeline.yml for UI-driven topology changes.
 * The serializer emits the canonical shape the schema and scripts expect
 * (validated in CI by scripts/validate-pipeline-config.mjs on the config PR).
 */
export interface DevOrg {
  name: string;
  org: string;
  authMethod: "jwt" | "sfdx-url";
}

export interface PipelineConfig {
  devOrgs: DevOrg[];
  pipeline: Stage[];
}

export const BRANCH_RE = /^[a-z0-9][a-z0-9-]*$/;
export const ENV_RE = /^[a-z0-9][a-z0-9-]*$/;
export const ORG_KEY_RE = /^[A-Z][A-Z0-9_]*$/;

const HEADER = `# OrbitOps pipeline definition — the single source of truth for stages and gates.
# Edited via PR only (see CODEOWNERS). Validated by scripts/validate-pipeline-config.mjs.
# Stage order in this file IS the promotion order (left to right on the board).
`;

export function parsePipelineConfig(raw: string): PipelineConfig {
  const cfg = load(raw) as { devOrgs?: DevOrg[]; pipeline?: Stage[] } | null;
  if (!cfg || !Array.isArray(cfg.pipeline) || cfg.pipeline.length === 0) {
    throw new Error("pipeline.yml has no pipeline stages");
  }
  return { devOrgs: cfg.devOrgs ?? [], pipeline: cfg.pipeline };
}

/** Canonical key order keeps diffs reviewable and matches the documented shape. */
function canonicalStage(s: Stage): Record<string, unknown> {
  const gates: Record<string, unknown> = {
    scannerMaxSeverity: s.gates.scannerMaxSeverity,
    minCoverage: s.gates.minCoverage,
  };
  if (s.gates.requiredReviewers) gates.requiredReviewers = true;
  if (s.gates.workItemStatus) gates.workItemStatus = s.gates.workItemStatus;
  const out: Record<string, unknown> = {
    branch: s.branch,
    org: s.org,
    environment: s.environment,
    authMethod: s.authMethod,
  };
  if (s.testLevel) out.testLevel = s.testLevel;
  out.gates = gates;
  return out;
}

export function serializePipelineConfig(cfg: PipelineConfig): string {
  const doc: Record<string, unknown> = {};
  if (cfg.devOrgs.length) {
    doc.devOrgs = cfg.devOrgs.map((d) => ({ name: d.name, org: d.org, authMethod: d.authMethod }));
  }
  doc.pipeline = cfg.pipeline.map(canonicalStage);
  return HEADER + "\n" + dump(doc, { indent: 2, lineWidth: -1 });
}

/** Returns an error message, or null if the new stage is valid for this config. */
export function validateNewStage(cfg: PipelineConfig, stage: Stage): string | null {
  if (!ENV_RE.test(stage.environment)) return "Stage name must be lowercase letters, numbers, and dashes (e.g. sit).";
  if (!BRANCH_RE.test(stage.branch)) return "Branch must be lowercase letters, numbers, and dashes (e.g. sit).";
  if (!ORG_KEY_RE.test(stage.org)) return "Org key must be uppercase letters, numbers, and underscores (e.g. SIT).";
  if (cfg.pipeline.some((s) => s.environment === stage.environment)) return `A stage called "${stage.environment}" already exists.`;
  if (cfg.pipeline.some((s) => s.branch === stage.branch)) return `Branch "${stage.branch}" is already mapped to a stage.`;
  if (cfg.pipeline.some((s) => s.org === stage.org)) return `Org key "${stage.org}" is already used by another stage.`;
  const cov = stage.gates.minCoverage;
  const sev = stage.gates.scannerMaxSeverity;
  if (!Number.isInteger(cov) || cov < 0 || cov > 100) return "Coverage must be between 0 and 100.";
  if (!Number.isInteger(sev) || sev < 1 || sev > 5) return "Scan severity must be between 1 and 5.";
  return null;
}
