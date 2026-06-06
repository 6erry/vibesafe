import type { Finding } from "../types";
import { summarizeFindings } from "./report";

export function renderJsonReport(
  findings: Finding[],
  warnings: string[] = [],
): string {
  return `${JSON.stringify(
    {
      tool: "vibesafe",
      summary: summarizeFindings(findings),
      warnings,
      findings,
    },
    null,
    2,
  )}\n`;
}
