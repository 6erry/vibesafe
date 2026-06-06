import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { GitDiff, GitDiffFileStat } from "../types";

const execFileAsync = promisify(execFile);

export async function isGitRepository(cwd: string): Promise<boolean> {
  const output = await git(cwd, ["rev-parse", "--is-inside-work-tree"]);
  return output.trim() === "true";
}

export async function getGitDiff(
  cwd: string,
  mode: "diff" | "staged",
): Promise<GitDiff> {
  if (mode === "staged") {
    const [files, stats, raw] = await Promise.all([
      gitLines(cwd, [
        "diff",
        "--name-only",
        "--cached",
        "--diff-filter=ACMRTUXB",
      ]),
      gitNumstat(cwd, ["diff", "--cached", "--numstat"]),
      git(cwd, ["diff", "--cached"]),
    ]);
    return { mode, changedFiles: unique(files), stats, raw };
  }

  const base = await detectBaseRef(cwd);
  const diffArgs = base
    ? ["diff", "--name-only", "--diff-filter=ACMRTUXB", `${base}...HEAD`]
    : [];
  const statArgs = base ? ["diff", "--numstat", `${base}...HEAD`] : [];

  const trackedDiff = diffArgs.length > 0 ? await gitLines(cwd, diffArgs) : [];
  const unstaged = await gitLines(cwd, [
    "diff",
    "--name-only",
    "--diff-filter=ACMRTUXB",
  ]);
  const staged = await gitLines(cwd, [
    "diff",
    "--name-only",
    "--cached",
    "--diff-filter=ACMRTUXB",
  ]);
  const untracked = await gitLines(cwd, [
    "ls-files",
    "--others",
    "--exclude-standard",
  ]);
  const stats =
    statArgs.length > 0
      ? await gitNumstat(cwd, statArgs)
      : await gitNumstat(cwd, ["diff", "--numstat"]);
  const raw =
    statArgs.length > 0
      ? await git(cwd, ["diff", `${base}...HEAD`])
      : await git(cwd, ["diff"]);

  return {
    mode,
    changedFiles: unique([
      ...trackedDiff,
      ...unstaged,
      ...staged,
      ...untracked,
    ]),
    stats,
    raw,
  };
}

async function detectBaseRef(cwd: string): Promise<string | undefined> {
  const candidates = ["origin/main", "origin/master", "main", "master"];
  for (const candidate of candidates) {
    const mergeBase = await git(cwd, ["merge-base", "HEAD", candidate]);
    if (mergeBase.trim()) {
      return mergeBase.trim();
    }
  }
  return undefined;
}

async function gitLines(cwd: string, args: string[]): Promise<string[]> {
  const output = await git(cwd, args);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function gitNumstat(
  cwd: string,
  args: string[],
): Promise<GitDiffFileStat[]> {
  const output = await git(cwd, args);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [additions, deletions, ...pathParts] = line.split(/\s+/);
      return {
        path: pathParts.join(" "),
        additions: additions === "-" ? 0 : Number(additions),
        deletions: deletions === "-" ? 0 : Number(deletions),
      };
    });
}

async function git(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      maxBuffer: 20 * 1024 * 1024,
    });
    return stdout;
  } catch {
    return "";
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}
