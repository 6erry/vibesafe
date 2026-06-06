import type { Rule } from "../rule";
import { createFinding, hasAuthSignal } from "./helpers";

export const apiAdminNoAuthRule: Rule = {
  id: "api.admin-no-auth",
  title: "Admin API without obvious auth",
  description:
    "Detects admin-like routes or operations without obvious authentication signals.",
  defaultSeverity: "high",
  category: "auth",
  run(context) {
    const findings = [];
    const adminPath = /(^|\/)(admin|api\/admin)(\/|\.|-|$)/i;
    const privilegedOperation =
      /\b(deleteUser|updateRole|grantAdmin|setAdmin|banUser|deleteAccount)\b/i;

    for (const file of context.files) {
      const looksPrivileged =
        adminPath.test(file.path) || privilegedOperation.test(file.content);
      if (!looksPrivileged || hasAuthSignal(file.content)) {
        continue;
      }

      findings.push(
        createFinding({
          ruleId: apiAdminNoAuthRule.id,
          title: apiAdminNoAuthRule.title,
          severity: privilegedOperation.test(file.content) ? "high" : "medium",
          category: "auth",
          file,
          message:
            "This looks like an admin or privileged API path without an obvious authentication or authorization check.",
          recommendation:
            "Require authentication and explicit role/ownership authorization before privileged operations.",
          confidence: "low",
        }),
      );
    }

    return findings;
  },
};
