import YAML from "yaml";
import type { Rule } from "../rule";
import { createFinding, findAllLines, findLine } from "./helpers";

export const githubActionsInvalidWorkflowYamlRule: Rule = {
  id: "github-actions.invalid-workflow-yaml",
  title: "Invalid GitHub Actions workflow YAML",
  description: "Detects workflow YAML files that cannot be parsed.",
  defaultSeverity: "medium",
  category: "ci",
  run(context) {
    const findings = [];

    for (const file of context.files.filter(isWorkflowFile)) {
      const parsed = parseWorkflow(file.content);
      if (parsed.ok) {
        continue;
      }

      findings.push(
        createFinding({
          ruleId: githubActionsInvalidWorkflowYamlRule.id,
          title: githubActionsInvalidWorkflowYamlRule.title,
          severity: "medium",
          category: "ci",
          file,
          message: "This GitHub Actions workflow YAML could not be parsed.",
          evidence: parsed.error,
          recommendation:
            "Fix the workflow YAML syntax before relying on CI or VibeSafe workflow-specific checks.",
          confidence: "high",
        }),
      );
    }

    return findings;
  },
};

export const githubActionsOverprivilegedPermissionsRule: Rule = {
  id: "github-actions.overprivileged-permissions",
  title: "Overprivileged GitHub Actions permissions",
  description: "Detects broad GitHub Actions workflow permissions.",
  defaultSeverity: "high",
  category: "ci",
  run(context) {
    const findings = [];

    for (const file of context.files.filter(isWorkflowFile)) {
      const parsed = parseWorkflow(file.content);
      if (!parsed.ok) {
        continue;
      }

      const permissions = parsed.value.permissions;
      const writeAll = findLine(
        file.content,
        /^\s*permissions\s*:\s*write-all\s*$/im,
      );
      if (permissions === "write-all" || writeAll) {
        findings.push(
          createFinding({
            ruleId: githubActionsOverprivilegedPermissionsRule.id,
            title: githubActionsOverprivilegedPermissionsRule.title,
            severity: "high",
            category: "ci",
            file,
            line: writeAll?.line,
            column: writeAll?.column,
            message: "This workflow grants `permissions: write-all`.",
            evidence: writeAll?.text,
            recommendation:
              "Use least-privilege permissions such as `contents: read` and add write scopes only when required.",
            confidence: "high",
          }),
        );
        continue;
      }

      if (permissions && typeof permissions === "object") {
        const writeScopes = Object.entries(permissions).filter(
          ([, value]) => value === "write",
        );
        if (writeScopes.length >= 2) {
          findings.push(
            createFinding({
              ruleId: githubActionsOverprivilegedPermissionsRule.id,
              title: githubActionsOverprivilegedPermissionsRule.title,
              severity: "medium",
              category: "ci",
              file,
              message: `This workflow grants multiple write permissions: ${writeScopes.map(([key]) => key).join(", ")}.`,
              recommendation:
                "Review each write scope and keep only the permissions needed by the job.",
              confidence: "medium",
            }),
          );
        }
      }
    }

    return findings;
  },
};

export const githubActionsPullRequestTargetRiskRule: Rule = {
  id: "github-actions.pull-request-target-risk",
  title: "Risky pull_request_target workflow",
  description:
    "Detects pull_request_target workflows that may execute untrusted code.",
  defaultSeverity: "high",
  category: "ci",
  run(context) {
    const findings = [];

    for (const file of context.files.filter(isWorkflowFile)) {
      const usesPullRequestTarget = hasPullRequestTarget(
        file.content,
        parseWorkflow(file.content),
      );
      if (!usesPullRequestTarget) {
        continue;
      }

      const checkout = /uses\s*:\s*actions\/checkout@/i.test(file.content);
      const runStep = /^\s*-?\s*run\s*:/im.test(file.content);
      findings.push(
        createFinding({
          ruleId: githubActionsPullRequestTargetRiskRule.id,
          title: githubActionsPullRequestTargetRiskRule.title,
          severity: checkout && runStep ? "high" : "medium",
          category: "ci",
          file,
          message:
            "`pull_request_target` runs with target repository privileges and can be dangerous with checkout or run steps.",
          recommendation:
            "Use `pull_request` for untrusted code, or avoid checking out/running PR code under `pull_request_target`.",
          confidence: checkout && runStep ? "high" : "medium",
        }),
      );
    }

    return findings;
  },
};

export const githubActionsUnpinnedActionRule: Rule = {
  id: "github-actions.unpinned-action",
  title: "Unpinned GitHub Action reference",
  description:
    "Detects actions pinned to mutable refs such as main, master, or latest.",
  defaultSeverity: "medium",
  category: "ci",
  run(context) {
    const findings = [];
    const pattern = /^\s*-?\s*uses\s*:\s*[^@\s]+@(main|master|latest)\s*$/gim;

    for (const file of context.files.filter(isWorkflowFile)) {
      for (const match of findAllLines(file.content, pattern)) {
        findings.push(
          createFinding({
            ruleId: githubActionsUnpinnedActionRule.id,
            title: githubActionsUnpinnedActionRule.title,
            severity: "medium",
            category: "ci",
            file,
            line: match.line,
            column: match.column,
            message: "This workflow uses a mutable action ref.",
            evidence: match.text,
            recommendation:
              "Pin third-party actions to a full commit SHA or a trusted immutable version tag.",
            confidence: "high",
          }),
        );
      }
    }

    return findings;
  },
};

function isWorkflowFile(file: { path: string }): boolean {
  return /^\.github\/workflows\/.+\.ya?ml$/i.test(file.path);
}

type ParseWorkflowResult =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; error: string };

function parseWorkflow(content: string): ParseWorkflowResult {
  try {
    const parsed = YAML.parse(content);
    return parsed && typeof parsed === "object"
      ? { ok: true, value: parsed as Record<string, unknown> }
      : { ok: true, value: {} };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Invalid YAML",
    };
  }
}

function hasPullRequestTarget(
  content: string,
  parsed: ParseWorkflowResult,
): boolean {
  if (/\bpull_request_target\b/i.test(content)) {
    return true;
  }

  if (!parsed.ok) {
    return false;
  }

  const trigger = parsed.value.on;
  if (trigger === "pull_request_target") {
    return true;
  }
  if (Array.isArray(trigger)) {
    return trigger.includes("pull_request_target");
  }
  return Boolean(
    trigger && typeof trigger === "object" && "pull_request_target" in trigger,
  );
}
