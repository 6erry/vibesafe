export const severityOrder = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
] as const;
export type Severity = (typeof severityOrder)[number];

export const categoryValues = [
  "secret",
  "config",
  "auth",
  "payment",
  "database",
  "agent",
  "ci",
  "release",
] as const;
export type FindingCategory = (typeof categoryValues)[number];

export type Confidence = "high" | "medium" | "low";
export type ScanMode = "full" | "diff" | "staged" | "hook";
export type ScanSource =
  | "cli"
  | "github-action"
  | "claude-hook"
  | "gemini-extension"
  | "mcp-proxy";
export type PackageManager = "npm" | "pnpm" | "yarn" | "bun" | "unknown";
export type FrameworkHint =
  | "nextjs"
  | "firebase"
  | "supabase"
  | "stripe"
  | "github-actions"
  | "unknown";
export type RuleLevel = "off" | "warn" | "error";
export type RuleProfile = "recommended" | "strict" | "indie" | "agency";

export interface Finding {
  id: string;
  ruleId: string;
  title: string;
  severity: Severity;
  category: FindingCategory;
  file?: string;
  line?: number;
  column?: number;
  message: string;
  evidence?: string;
  recommendation: string;
  references?: string[];
  confidence: Confidence;
}

export interface ScannedFile {
  path: string;
  absolutePath: string;
  content: string;
  size: number;
}

export interface GitDiffFileStat {
  path: string;
  additions: number;
  deletions: number;
}

export interface GitDiff {
  mode: Exclude<ScanMode, "full" | "hook">;
  changedFiles: string[];
  stats: GitDiffFileStat[];
  raw?: string;
}

export interface VibeSafeConfig {
  version: 1;
  profile: RuleProfile;
  scan: {
    mode: Exclude<ScanMode, "hook">;
    include: string[];
    exclude: string[];
  };
  rules: Record<string, RuleLevel>;
  agent: {
    block: string[];
    requireApproval: string[];
  };
}

export interface ScanContext {
  cwd: string;
  mode: ScanMode;
  files: ScannedFile[];
  diff?: GitDiff;
  packageManager: PackageManager;
  frameworks: FrameworkHint[];
  config: VibeSafeConfig;
  source: ScanSource;
  warnings: string[];
}
