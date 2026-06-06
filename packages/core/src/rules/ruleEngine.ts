import type { Finding, RuleLevel, ScanContext, Severity } from "../types";
import { severityOrder } from "../types";
import type { Rule } from "./rule";

export class RuleEngine {
  constructor(private readonly rules: Rule[]) {}

  async run(context: ScanContext): Promise<Finding[]> {
    return runRules(context, this.rules);
  }
}

export async function runRules(
  context: ScanContext,
  rules: Rule[],
): Promise<Finding[]> {
  const findings: Finding[] = [];

  for (const rule of rules) {
    if (ruleLevelFor(context, rule.id) === "off") {
      continue;
    }

    let ruleFindings: Finding[];
    try {
      ruleFindings = await rule.run(context);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      context.warnings.push(`Rule ${rule.id} failed: ${message}`);
      continue;
    }
    findings.push(
      ...filterIgnoredFindings(
        context,
        ruleFindings.map((finding) =>
          applyRuleLevel(finding, ruleLevelFor(context, rule.id)),
        ),
      ),
    );
  }

  return sortFindings(findings);
}

export function ruleLevelFor(context: ScanContext, ruleId: string): RuleLevel {
  return context.config.rules[ruleId] ?? "warn";
}

export function sortFindings(findings: Finding[]): Finding[] {
  return [...findings].sort((a, b) => {
    const severityDiff = severityRank(a.severity) - severityRank(b.severity);
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return `${a.file ?? ""}:${a.line ?? 0}:${a.ruleId}`.localeCompare(
      `${b.file ?? ""}:${b.line ?? 0}:${b.ruleId}`,
    );
  });
}

export function severityRank(severity: Severity): number {
  return severityOrder.indexOf(severity);
}

function applyRuleLevel(finding: Finding, level: RuleLevel): Finding {
  if (level !== "warn") {
    return finding;
  }

  if (finding.severity === "critical" || finding.severity === "high") {
    return {
      ...finding,
      severity: "medium",
    };
  }

  return finding;
}

function filterIgnoredFindings(
  context: ScanContext,
  findings: Finding[],
): Finding[] {
  return findings.filter((finding) => !isIgnored(context, finding));
}

function isIgnored(context: ScanContext, finding: Finding): boolean {
  if (!finding.file) {
    return false;
  }

  const file = context.files.find(
    (candidate) => candidate.path === finding.file,
  );
  if (!file) {
    return false;
  }

  const lines = file.content.split(/\r?\n/);
  if (
    hasIgnoreDirective(file.content, "vibesafe-ignore-file", finding.ruleId)
  ) {
    return true;
  }

  const lineIndex = finding.line ? finding.line - 1 : -1;
  if (lineIndex < 0) {
    return false;
  }

  const sameLine = lines[lineIndex] ?? "";
  const previousLine = lines[lineIndex - 1] ?? "";
  return (
    hasIgnoreDirective(sameLine, "vibesafe-ignore-line", finding.ruleId) ||
    hasIgnoreDirective(
      previousLine,
      "vibesafe-ignore-next-line",
      finding.ruleId,
    )
  );
}

function hasIgnoreDirective(
  text: string,
  directive: string,
  ruleId: string,
): boolean {
  const directivePattern = new RegExp(`${directive}(?:\\s+([^\\n*]+))?`, "i");
  const match = directivePattern.exec(text);
  if (!match) {
    return false;
  }

  const rules = match[1]
    ?.split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean);
  return !rules || rules.length === 0 || rules.includes(ruleId);
}
