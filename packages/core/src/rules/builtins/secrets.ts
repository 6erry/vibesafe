import { basename, extname } from "node:path";
import type { Rule } from "../rule";
import { createFinding, findAllLines, maskSecret } from "./helpers";

const sensitiveNames = new Set([
  ".env",
  ".env.local",
  ".env.production",
  ".env.development.local",
  "id_rsa",
  "serviceAccountKey.json",
]);
const sensitiveExtensions = new Set([".pem", ".key"]);
const safeEnvNames = new Set([".env.example", ".env.sample", ".env.template"]);

export const noEnvCommitRule: Rule = {
  id: "secrets.no-env-commit",
  title: "Sensitive environment or key file committed",
  description: "Detects committed .env files and private key material.",
  defaultSeverity: "high",
  category: "secret",
  run(context) {
    return context.files
      .filter((file) => isSensitivePath(file.path))
      .map((file) =>
        createFinding({
          ruleId: noEnvCommitRule.id,
          title: noEnvCommitRule.title,
          severity:
            basename(file.path) === "serviceAccountKey.json" ||
            extname(file.path) === ".pem"
              ? "critical"
              : "high",
          category: "secret",
          file,
          message: `${file.path} looks like a sensitive environment or private key file.`,
          recommendation:
            "Remove the file from git, add it to .gitignore, rotate exposed credentials, and commit a safe example file instead.",
          confidence: "high",
        }),
      );
  },
};

export const apiKeyPatternRule: Rule = {
  id: "secrets.api-key-pattern",
  title: "Possible secret value in source",
  description: "Detects common API key and token formats.",
  defaultSeverity: "high",
  category: "secret",
  run(context) {
    const findings = [];

    for (const file of context.files) {
      for (const pattern of secretPatterns) {
        for (const match of findAllLines(file.content, pattern.regex)) {
          if (
            isLikelyPlaceholder(match.match) ||
            /example|sample|placeholder/i.test(match.text)
          ) {
            continue;
          }

          findings.push(
            createFinding({
              ruleId: apiKeyPatternRule.id,
              title: apiKeyPatternRule.title,
              severity: pattern.severity,
              category: "secret",
              file,
              line: match.line,
              column: match.column,
              message: `Possible ${pattern.name} found in source.`,
              evidence: maskSecret(match.match),
              recommendation:
                "Move the secret to a private secret manager or environment variable, rotate it if it was committed, and keep only examples in source.",
              confidence: pattern.confidence,
            }),
          );
        }
      }
    }

    return findings;
  },
};

function isSensitivePath(path: string): boolean {
  const name = basename(path);
  if (safeEnvNames.has(name)) {
    return false;
  }
  return sensitiveNames.has(name) || sensitiveExtensions.has(extname(name));
}

function isLikelyPlaceholder(value: string): boolean {
  return /x{6,}|example|test_key|placeholder|your[_-]?key|dummy/i.test(value);
}

const secretPatterns = [
  {
    name: "OpenAI API key",
    regex: /\bsk-(?:proj-)?[A-Za-z0-9_-]{24,}\b/g,
    severity: "high" as const,
    confidence: "medium" as const,
  },
  {
    name: "Anthropic API key",
    regex: /\bsk-ant-[A-Za-z0-9_-]{24,}\b/g,
    severity: "high" as const,
    confidence: "high" as const,
  },
  {
    name: "Stripe secret key",
    regex: /\bsk_(?:live|test)_[A-Za-z0-9]{16,}\b/g,
    severity: "critical" as const,
    confidence: "high" as const,
  },
  {
    name: "GitHub token",
    regex: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g,
    severity: "high" as const,
    confidence: "high" as const,
  },
  {
    name: "AWS access key",
    regex: /\bAKIA[0-9A-Z]{16}\b/g,
    severity: "high" as const,
    confidence: "high" as const,
  },
];
