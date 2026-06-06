import type { Finding } from "../types";
import { severityOrder } from "../types";
import { groupBySeverity, summarizeFindings } from "./report";

export function renderTextReport(
  findings: Finding[],
  warnings: string[] = [],
): string {
  const summary = summarizeFindings(findings);
  const lines = ["VibeSafe Report", ""];

  for (const severity of severityOrder) {
    lines.push(`${capitalize(severity)}: ${summary.counts[severity]}`);
  }

  if (warnings.length > 0) {
    lines.push("", "Scanner warnings:");
    for (const warning of warnings) {
      lines.push(`- ${warning}`);
    }
  }

  const groups = groupBySeverity(findings);
  for (const severity of severityOrder) {
    const severityFindings = groups[severity];
    for (const finding of severityFindings) {
      const location = finding.file
        ? ` ${finding.file}${finding.line ? `:${finding.line}` : ""}`
        : "";
      lines.push("", `${severity.toUpperCase()} ${finding.ruleId}${location}`);
      lines.push(finding.message);
      if (finding.evidence) {
        lines.push(`Evidence: ${finding.evidence}`);
      }
      lines.push(`Recommendation: ${finding.recommendation}`);
    }
  }

  if (findings.length === 0) {
    lines.push(
      "",
      "No findings. Keep reviewing security-sensitive changes manually.",
    );
  }

  return `${lines.join("\n")}\n`;
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
