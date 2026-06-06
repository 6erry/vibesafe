import type { Rule } from "../rule";
import {
  createFinding,
  findAllLines,
  isFrontendPath,
  maskSecret,
} from "./helpers";

export const supabaseRlsDisabledRule: Rule = {
  id: "supabase.rls-disabled",
  title: "Supabase row level security disabled",
  description: "Detects SQL migrations that disable row level security.",
  defaultSeverity: "high",
  category: "database",
  run(context) {
    const findings = [];
    const pattern = /\bdisable\s+row\s+level\s+security\b/gi;

    for (const file of context.files) {
      if (!file.path.endsWith(".sql")) {
        continue;
      }

      for (const match of findAllLines(file.content, pattern)) {
        findings.push(
          createFinding({
            ruleId: supabaseRlsDisabledRule.id,
            title: supabaseRlsDisabledRule.title,
            severity: "high",
            category: "database",
            file,
            line: match.line,
            column: match.column,
            message: "This migration disables Supabase row level security.",
            evidence: match.text,
            recommendation:
              "Enable RLS and add explicit policies for every table exposed through Supabase.",
            confidence: "high",
          }),
        );
      }
    }

    return findings;
  },
};

export const supabaseServiceRoleClientRule: Rule = {
  id: "supabase.service-role-client",
  title: "Supabase service role key exposed to client",
  description:
    "Detects public Supabase service-role environment variables or client-side use.",
  defaultSeverity: "critical",
  category: "secret",
  run(context) {
    const findings = [];
    const publicNamePattern =
      /\b(?:NEXT_PUBLIC|VITE|PUBLIC)_[A-Z0-9_]*SUPABASE[A-Z0-9_]*SERVICE[A-Z0-9_]*ROLE[A-Z0-9_]*\b/gi;
    const serviceRoleAssignmentPattern =
      /\bSUPABASE[A-Z0-9_]*SERVICE[A-Z0-9_]*ROLE[A-Z0-9_]*\s*[:=]\s*["']?([^"'\s;]+)/gi;

    for (const file of context.files) {
      for (const match of findAllLines(file.content, publicNamePattern)) {
        findings.push(
          createFinding({
            ruleId: supabaseServiceRoleClientRule.id,
            title: supabaseServiceRoleClientRule.title,
            severity: "critical",
            category: "secret",
            file,
            line: match.line,
            column: match.column,
            message:
              "A public Supabase service-role environment variable name is present.",
            evidence: match.match,
            recommendation:
              "Never expose Supabase service-role keys to browser code. Use server-only environment variables and RLS policies.",
            confidence: "high",
          }),
        );
      }

      if (!isFrontendPath(file.path)) {
        continue;
      }

      for (const match of findAllLines(
        file.content,
        serviceRoleAssignmentPattern,
      )) {
        findings.push(
          createFinding({
            ruleId: supabaseServiceRoleClientRule.id,
            title: supabaseServiceRoleClientRule.title,
            severity: "critical",
            category: "secret",
            file,
            line: match.line,
            column: match.column,
            message: "A Supabase service-role key appears in frontend code.",
            evidence: maskSecret(match.match),
            recommendation:
              "Move service-role access to trusted server code and expose only anon keys to the browser.",
            confidence: "medium",
          }),
        );
      }
    }

    return findings;
  },
};
