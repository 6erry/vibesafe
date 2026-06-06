import { severityRank } from "../rules/ruleEngine";
import type { Finding, Severity } from "../types";
import { severityOrder } from "../types";

export type FailOn = Severity | "none";

export interface FindingSummary {
  total: number;
  counts: Record<Severity, number>;
}

export function summarizeFindings(findings: Finding[]): FindingSummary {
  const counts = Object.fromEntries(
    severityOrder.map((severity) => [severity, 0]),
  ) as Record<Severity, number>;
  for (const finding of findings) {
    counts[finding.severity] += 1;
  }
  return { total: findings.length, counts };
}

export function shouldFail(findings: Finding[], failOn: FailOn): boolean {
  if (failOn === "none") {
    return false;
  }
  const threshold = severityRank(failOn);
  return findings.some(
    (finding) => severityRank(finding.severity) <= threshold,
  );
}

export function groupBySeverity(
  findings: Finding[],
): Record<Severity, Finding[]> {
  return Object.fromEntries(
    severityOrder.map((severity) => [
      severity,
      findings.filter((finding) => finding.severity === severity),
    ]),
  ) as Record<Severity, Finding[]>;
}
