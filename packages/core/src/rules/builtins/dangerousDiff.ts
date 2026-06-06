import type { Rule } from "../rule";
import { createFinding } from "./helpers";

export const diffLargeChangeRule: Rule = {
  id: "diff.large-change",
  title: "Large diff",
  description: "Detects unusually large changes that deserve manual review.",
  defaultSeverity: "medium",
  category: "release",
  run(context) {
    if (!context.diff) {
      return [];
    }

    const changedFiles = context.diff.changedFiles.length;
    const changedLines = context.diff.stats.reduce(
      (sum, stat) => sum + stat.additions + stat.deletions,
      0,
    );
    const packageLockChange = context.diff.stats.find((stat) =>
      /(?:package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/.test(
        stat.path,
      ),
    );
    const largeLockChange =
      packageLockChange &&
      packageLockChange.additions + packageLockChange.deletions > 1000;

    if (changedFiles < 50 && changedLines < 5000 && !largeLockChange) {
      return [];
    }

    return [
      createFinding({
        ruleId: diffLargeChangeRule.id,
        title: diffLargeChangeRule.title,
        severity: "medium",
        category: "release",
        message: `This change touches ${changedFiles} files and ${changedLines} changed lines.`,
        recommendation:
          "Split large changes when possible and manually review auth, payment, database, and deployment changes before merging.",
        confidence: "medium",
      }),
    ];
  },
};

export const diffDeletesAuthChecksRule: Rule = {
  id: "diff.deletes-auth-checks",
  title: "Auth or permission checks removed",
  description:
    "Detects deleted diff lines that look like authentication or authorization checks.",
  defaultSeverity: "high",
  category: "auth",
  run(context) {
    if (!context.diff?.raw) {
      return [];
    }

    const findings = [];
    const deletedLines = parseDeletedDiffLines(context.diff.raw);

    for (const deleted of deletedLines) {
      if (!authDeletionPattern.test(deleted.text)) {
        continue;
      }

      authDeletionPattern.lastIndex = 0;
      findings.push(
        createFinding({
          ruleId: diffDeletesAuthChecksRule.id,
          title: diffDeletesAuthChecksRule.title,
          severity: "high",
          category: "auth",
          filePath: deleted.file,
          line: deleted.line,
          message:
            "This diff removes a line that looks like an auth, permission, role, or policy check.",
          evidence: deleted.text.trim(),
          recommendation:
            "Manually verify that equivalent authentication and authorization checks still protect this path.",
          confidence: "medium",
        }),
      );
    }

    return findings.slice(0, 20);
  },
};

export const diffDeletesTestsRule: Rule = {
  id: "diff.deletes-tests",
  title: "Tests removed from diff",
  description:
    "Detects deleted test files or unusually large deletions in test files.",
  defaultSeverity: "medium",
  category: "release",
  run(context) {
    if (!context.diff) {
      return [];
    }

    const findings = [];
    for (const stat of context.diff.stats) {
      if (!isTestPath(stat.path) || stat.deletions === 0) {
        continue;
      }

      const deletedWholeFile = stat.additions === 0 && stat.deletions > 20;
      const largeTestDeletion = stat.deletions >= 50;
      if (!deletedWholeFile && !largeTestDeletion) {
        continue;
      }

      findings.push(
        createFinding({
          ruleId: diffDeletesTestsRule.id,
          title: diffDeletesTestsRule.title,
          severity: "medium",
          category: "release",
          filePath: stat.path,
          message: `This diff removes ${stat.deletions} line${stat.deletions === 1 ? "" : "s"} from test file ${stat.path}.`,
          recommendation:
            "Confirm tests were intentionally removed or replaced with equivalent coverage before merging.",
          confidence: deletedWholeFile ? "high" : "medium",
        }),
      );
    }

    return findings;
  },
};

interface DeletedDiffLine {
  file?: string;
  line?: number;
  text: string;
}

const authDeletionPattern =
  /\b(auth|authorize|authorization|permission|permissions|policy|guard|middleware|requireAuth|requireUser|verifyToken|role|isAdmin|owner|ownership)\b/i;

function parseDeletedDiffLines(raw: string): DeletedDiffLine[] {
  const deletedLines: DeletedDiffLine[] = [];
  let currentFile: string | undefined;
  let oldLine: number | undefined;

  for (const line of raw.split(/\r?\n/)) {
    const fileMatch = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (fileMatch) {
      currentFile = fileMatch[2];
      oldLine = undefined;
      continue;
    }

    const hunkMatch = /^@@ -(\d+)(?:,\d+)? \+\d+(?:,\d+)? @@/.exec(line);
    if (hunkMatch) {
      oldLine = Number(hunkMatch[1]);
      continue;
    }

    if (oldLine === undefined) {
      continue;
    }

    if (line.startsWith("---")) {
      continue;
    }

    if (line.startsWith("-")) {
      deletedLines.push({
        file: currentFile,
        line: oldLine,
        text: line.slice(1),
      });
      oldLine += 1;
      continue;
    }

    if (line.startsWith("+")) {
      continue;
    }

    oldLine += 1;
  }

  return deletedLines;
}

function isTestPath(path: string): boolean {
  return (
    /(^|\/)(__tests__|tests?|spec)\//i.test(path) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/i.test(path)
  );
}
