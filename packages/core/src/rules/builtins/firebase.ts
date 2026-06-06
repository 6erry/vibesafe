import type { Rule } from "../rule";
import { createFinding, findAllLines } from "./helpers";

const publicRulePattern =
  /\ballow\s+(?:read\s*,\s*write|write\s*,\s*read|read|write)\s*:\s*if\s+true\s*;/gi;

export const firebasePublicReadWriteRule: Rule = {
  id: "firebase.public-read-write",
  title: "Firebase rules allow public access",
  description:
    "Detects Firestore or Storage rules that allow public read/write access.",
  defaultSeverity: "high",
  category: "database",
  run(context) {
    const findings = [];

    for (const file of context.files) {
      if (!isFirebaseRulesFile(file.path, file.content)) {
        continue;
      }

      for (const match of findAllLines(file.content, publicRulePattern)) {
        findings.push(
          createFinding({
            ruleId: firebasePublicReadWriteRule.id,
            title: firebasePublicReadWriteRule.title,
            severity: /write/i.test(match.match) ? "high" : "medium",
            category: "database",
            file,
            line: match.line,
            column: match.column,
            message: "Firebase rules allow public access with `if true`.",
            evidence: match.text,
            recommendation:
              "Require `request.auth` and resource ownership checks before allowing reads or writes.",
            confidence: "high",
          }),
        );
      }
    }

    return findings;
  },
};

function isFirebaseRulesFile(path: string, content: string): boolean {
  return (
    path.endsWith("firestore.rules") ||
    path.endsWith("storage.rules") ||
    /rules_version\s*=/.test(content)
  );
}
