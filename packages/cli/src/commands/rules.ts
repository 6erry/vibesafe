import {
  builtInRules,
  profileRuleDefaults,
  type RuleProfile,
} from "@6erry/vibesafe-core";
import type { Command } from "commander";

interface RulesOptions {
  format: "text" | "json";
  profile: RuleProfile;
}

export function registerRulesCommand(program: Command): void {
  program
    .command("rules")
    .description("List built-in VibeSafe rules.")
    .option("--format <format>", "output format: text, json", "text")
    .option(
      "--profile <profile>",
      "rule profile: recommended, strict, indie, agency",
      "recommended",
    )
    .action((options: RulesOptions) => {
      assertValue(options.format, ["text", "json"], "--format");
      assertValue(
        options.profile,
        ["recommended", "strict", "indie", "agency"],
        "--profile",
      );

      const rows = builtInRules.map((rule) => ({
        id: rule.id,
        title: rule.title,
        category: rule.category,
        defaultSeverity: rule.defaultSeverity,
        profileLevel: profileRuleDefaults[options.profile][rule.id] ?? "warn",
        description: rule.description,
      }));

      if (options.format === "json") {
        process.stdout.write(
          `${JSON.stringify({ profile: options.profile, rules: rows }, null, 2)}\n`,
        );
        return;
      }

      process.stdout.write(renderTextRules(options.profile, rows));
    });
}

function renderTextRules(
  profile: RuleProfile,
  rows: Array<{
    id: string;
    title: string;
    category: string;
    defaultSeverity: string;
    profileLevel: string;
    description: string;
  }>,
): string {
  const lines = [`VibeSafe Rules (${profile})`, ""];
  for (const row of rows) {
    lines.push(
      `${row.id} [${row.profileLevel}]`,
      `  ${row.title}`,
      `  Category: ${row.category}; default severity: ${row.defaultSeverity}`,
      `  ${row.description}`,
      "",
    );
  }
  return lines.join("\n");
}

function assertValue<T extends string>(
  value: string,
  allowed: readonly T[],
  label: string,
): asserts value is T {
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`${label} must be one of: ${allowed.join(", ")}`);
  }
}
