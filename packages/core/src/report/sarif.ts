import type { Finding, Severity } from "../types";

export function renderSarifReport(
  findings: Finding[],
  warnings: string[] = [],
): string {
  const rules = [
    ...new Map(findings.map((finding) => [finding.ruleId, finding])).values(),
  ].map((finding) => ({
    id: finding.ruleId,
    name: finding.title,
    shortDescription: {
      text: finding.title,
    },
    fullDescription: {
      text: finding.message,
    },
    help: {
      text: finding.recommendation,
    },
    properties: {
      category: finding.category,
      defaultSeverity: finding.severity,
      confidence: finding.confidence,
    },
  }));

  const results = findings.map((finding) => ({
    ruleId: finding.ruleId,
    level: severityToSarifLevel(finding.severity),
    message: {
      text: `${finding.message} Recommendation: ${finding.recommendation}`,
    },
    locations: finding.file
      ? [
          {
            physicalLocation: {
              artifactLocation: {
                uri: finding.file,
              },
              region: {
                startLine: finding.line ?? 1,
                startColumn: finding.column ?? 1,
              },
            },
          },
        ]
      : undefined,
    properties: {
      severity: finding.severity,
      category: finding.category,
      confidence: finding.confidence,
      evidence: finding.evidence,
    },
  }));

  return `${JSON.stringify(
    {
      version: "2.1.0",
      $schema: "https://json.schemastore.org/sarif-2.1.0.json",
      runs: [
        {
          tool: {
            driver: {
              name: "VibeSafe",
              informationUri: "https://github.com/6erry/vibesafe",
              rules,
            },
          },
          invocations: [
            {
              executionSuccessful: true,
              toolExecutionNotifications: warnings.map((warning) => ({
                level: "warning",
                message: {
                  text: warning,
                },
              })),
            },
          ],
          results,
        },
      ],
    },
    null,
    2,
  )}\n`;
}

function severityToSarifLevel(
  severity: Severity,
): "error" | "warning" | "note" {
  if (severity === "critical" || severity === "high") {
    return "error";
  }
  if (severity === "medium" || severity === "low") {
    return "warning";
  }
  return "note";
}
