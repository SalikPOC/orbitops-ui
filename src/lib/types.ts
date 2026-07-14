export interface StageGates {
  scannerMaxSeverity: number;
  minCoverage: number;
  requiredReviewers?: boolean;
  workItemStatus?: string[];
}

export interface Stage {
  branch: string;
  org: string;
  environment: string;
  authMethod: "jwt" | "sfdx-url";
  testLevel?: "NoTestRun" | "RunLocalTests" | "Conditional";
  gates: StageGates;
}

export interface DeployManifest {
  type: "deploy" | "rollback";
  env: string;
  seq: number;
  sha: string;
  workItems: string[];
  components: Record<string, string[]>;
  destructive: Record<string, string[]>;
  componentCount: number;
  destructiveCount: number;
  runUrl: string;
  actor: string;
  timestamp: string;
  reason?: string;
  mode?: string;
  rolledBackFrom?: number;
  rolledBackTo?: number;
  includeDestructive?: boolean;
}

export interface CheckChip {
  name: string;
  status: "success" | "failure" | "pending" | "skipped" | "neutral";
  url?: string;
}

export interface Promotion {
  number: number;
  title: string;
  author: string;
  headBranch: string;
  baseBranch: string; // target stage branch
  workItems: string[];
  mergeable: boolean | null;
  url: string;
  checks: CheckChip[];
}

export type Role = "citizen" | "release-manager" | "admin";

export interface SessionUser {
  login: string;
  role: Role;
}
