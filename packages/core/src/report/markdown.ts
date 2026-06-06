import type { Finding } from "../types";
import { severityOrder } from "../types";
import { groupBySeverity, summarizeFindings } from "./report";

export function renderMarkdownReport(
  findings: Finding[],
  warnings: string[] = [],
): string {
  const summary = summarizeFindings(findings);
  const groups = groupBySeverity(findings);
  const lines = ["# VibeSafe Report", ""];

  lines.push(
    `Found ${summary.total} finding${summary.total === 1 ? "" : "s"}.`,
    "",
  );
  lines.push("| Severity | Count |", "|---|---:|");
  for (const severity of severityOrder) {
    lines.push(`| ${capitalize(severity)} | ${summary.counts[severity]} |`);
  }
  lines.push("");

  if (warnings.length > 0) {
    lines.push("## Scanner Warnings", "");
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push("");
  }

  for (const severity of severityOrder) {
    const severityFindings = groups[severity];
    if (severityFindings.length === 0) {
      continue;
    }

    lines.push(`## ${capitalize(severity)}`, "");
    for (const finding of severityFindings) {
      const location = finding.file
        ? ` (${finding.file}${finding.line ? `:${finding.line}` : ""})`
        : "";
      lines.push(`### ${finding.ruleId}${location}`);
      lines.push("");
      lines.push(finding.message);
      if (finding.evidence) {
        lines.push("", `Evidence: \`${finding.evidence}\``);
      }
      lines.push("", `Recommendation: ${finding.recommendation}`);
      lines.push("", `Confidence: ${finding.confidence}`, "");
    }
  }

  if (findings.length === 0) {
    lines.push(
      "No findings. Keep reviewing security-sensitive changes manually.",
      "",
    );
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
