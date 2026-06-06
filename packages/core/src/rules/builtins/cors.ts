import type { Rule } from "../rule";
import { createFinding, findAllLines } from "./helpers";

export const corsWildcardOriginRule: Rule = {
  id: "cors.wildcard-origin",
  title: "Wildcard CORS origin",
  description: "Detects wildcard CORS origins in application code.",
  defaultSeverity: "medium",
  category: "config",
  run(context) {
    const findings = [];
    const patterns = [
      /\borigin\s*:\s*["']\*["']/gi,
      /Access-Control-Allow-Origin["']?\s*,?\s*["']\*["']/gi,
      /["']Access-Control-Allow-Origin["']\s*:\s*["']\*["']/gi,
    ];

    for (const file of context.files) {
      for (const pattern of patterns) {
        for (const match of findAllLines(file.content, pattern)) {
          findings.push(
            createFinding({
              ruleId: corsWildcardOriginRule.id,
              title: corsWildcardOriginRule.title,
              severity: "medium",
              category: "config",
              file,
              line: match.line,
              column: match.column,
              message: "CORS is configured with wildcard origin `*`.",
              evidence: match.text,
              recommendation:
                "Restrict CORS origins to the exact frontend domains that should call this API.",
              confidence: "medium",
            }),
          );
        }
      }
    }

    return findings;
  },
};
