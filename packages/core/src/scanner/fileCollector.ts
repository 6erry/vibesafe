import { readFileSync, statSync } from "node:fs";
import { join, normalize } from "node:path";
import fg from "fast-glob";
import { defaultExcludePatterns } from "../config/schema";
import type { GitDiff, ScanMode, ScannedFile, VibeSafeConfig } from "../types";
import { getGitDiff, isGitRepository } from "./gitDiff";

export interface CollectFilesOptions {
  cwd: string;
  mode: Exclude<ScanMode, "hook">;
  config: VibeSafeConfig;
  maxFileSizeBytes?: number;
}

export interface CollectFilesResult {
  files: ScannedFile[];
  diff?: GitDiff;
  warnings: string[];
}

const defaultMaxFileSizeBytes = 1024 * 1024;

export async function collectScannedFiles(
  options: CollectFilesOptions,
): Promise<CollectFilesResult> {
  const maxFileSizeBytes = options.maxFileSizeBytes ?? defaultMaxFileSizeBytes;
  const warnings: string[] = [];
  let candidates: string[];
  let diff: GitDiff | undefined;

  if (options.mode === "full") {
    candidates = await collectAllCandidatePaths(options.cwd, options.config);
  } else {
    const gitRepo = await isGitRepository(options.cwd);
    if (!gitRepo) {
      warnings.push(
        "Not a git repository. Falling back to full repository scan.",
      );
      candidates = await collectAllCandidatePaths(options.cwd, options.config);
    } else {
      diff = await getGitDiff(options.cwd, options.mode);
      candidates = diff.changedFiles;
    }
  }

  const files = candidates
    .map((path) => readScannedFile(options.cwd, path, maxFileSizeBytes))
    .filter((file): file is ScannedFile => Boolean(file));

  return { files, diff, warnings };
}

async function collectAllCandidatePaths(
  cwd: string,
  config: VibeSafeConfig,
): Promise<string[]> {
  const ignore = [...defaultExcludePatterns, ...(config.scan.exclude ?? [])];
  return fg(config.scan.include.length > 0 ? config.scan.include : ["**/*"], {
    cwd,
    dot: true,
    onlyFiles: true,
    ignore,
    unique: true,
  });
}

function readScannedFile(
  cwd: string,
  relativePath: string,
  maxFileSizeBytes: number,
): ScannedFile | undefined {
  const normalized = normalize(relativePath).replaceAll("\\", "/");
  const absolutePath = join(cwd, normalized);

  try {
    const stat = statSync(absolutePath);
    if (!stat.isFile() || stat.size > maxFileSizeBytes) {
      return undefined;
    }

    const buffer = readFileSync(absolutePath);
    if (isBinary(buffer)) {
      return undefined;
    }

    return {
      path: normalized,
      absolutePath,
      content: buffer.toString("utf8"),
      size: stat.size,
    };
  } catch {
    return undefined;
  }
}

function isBinary(buffer: Buffer): boolean {
  if (buffer.includes(0)) {
    return true;
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, 512));
  let suspicious = 0;
  for (const byte of sample) {
    if (byte < 7 || (byte > 14 && byte < 32)) {
      suspicious += 1;
    }
  }
  return sample.length > 0 && suspicious / sample.length > 0.3;
}
