import { existsSync } from "node:fs";
import { join } from "node:path";
import { loadConfig } from "../config/loadConfig";
import type {
  FrameworkHint,
  PackageManager,
  ScanContext,
  ScanMode,
  ScanSource,
  VibeSafeConfig,
} from "../types";
import { collectScannedFiles } from "./fileCollector";

export interface CreateScanContextOptions {
  cwd: string;
  mode?: Exclude<ScanMode, "hook">;
  source?: ScanSource;
  config?: VibeSafeConfig;
}

export async function createScanContext(
  options: CreateScanContextOptions,
): Promise<ScanContext> {
  const config = options.config ?? loadConfig(options.cwd);
  const mode = options.mode ?? config.scan.mode;
  const collected = await collectScannedFiles({
    cwd: options.cwd,
    mode,
    config,
  });

  return {
    cwd: options.cwd,
    mode,
    files: collected.files,
    diff: collected.diff,
    packageManager: detectPackageManager(options.cwd),
    frameworks: detectFrameworks(
      options.cwd,
      collected.files.map((file) => file.path),
    ),
    config,
    source: options.source ?? "cli",
    warnings: collected.warnings,
  };
}

export function detectPackageManager(cwd: string): PackageManager {
  if (existsSync(join(cwd, "pnpm-lock.yaml"))) {
    return "pnpm";
  }
  if (existsSync(join(cwd, "yarn.lock"))) {
    return "yarn";
  }
  if (existsSync(join(cwd, "bun.lockb")) || existsSync(join(cwd, "bun.lock"))) {
    return "bun";
  }
  if (existsSync(join(cwd, "package-lock.json"))) {
    return "npm";
  }
  return "unknown";
}

export function detectFrameworks(
  cwd: string,
  paths: string[],
): FrameworkHint[] {
  const hints = new Set<FrameworkHint>();
  if (
    existsSync(join(cwd, "next.config.js")) ||
    existsSync(join(cwd, "next.config.mjs")) ||
    paths.some((p) => p.startsWith("app/") || p.startsWith("pages/"))
  ) {
    hints.add("nextjs");
  }
  if (
    paths.some(
      (p) => p.endsWith("firestore.rules") || p.endsWith("storage.rules"),
    )
  ) {
    hints.add("firebase");
  }
  if (paths.some((p) => p.includes("supabase/") || p.endsWith(".sql"))) {
    hints.add("supabase");
  }
  if (paths.some((p) => p.toLowerCase().includes("stripe"))) {
    hints.add("stripe");
  }
  if (paths.some((p) => p.startsWith(".github/workflows/"))) {
    hints.add("github-actions");
  }
  return hints.size > 0 ? [...hints] : ["unknown"];
}
