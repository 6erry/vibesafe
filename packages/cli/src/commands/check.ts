import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  builtInRules,
  createScanContext,
  type FailOn,
  loadConfig,
  RuleEngine,
  type RuleProfile,
  renderJsonReport,
  renderMarkdownReport,
  renderSarifReport,
  renderTextReport,
  type ScanMode,
  shouldFail,
} from "@6erry/vibesafe-core";
import type { Command } from "commander";

type OutputFormat = "text" | "markdown" | "json" | "sarif";

interface CheckOptions {
  mode: Exclude<ScanMode, "hook">;
  format: OutputFormat;
  output?: string;
  profile: RuleProfile;
  failOn: FailOn;
  cwd: string;
}

export function registerCheckCommand(program: Command): void {
  program
    .command("check")
    .description(
      "Scan a repository or git diff for common AI-assisted development safety risks.",
    )
    .option("--mode <mode>", "scan mode: full, diff, staged", "diff")
    .option(
      "--format <format>",
      "output format: text, markdown, json, sarif",
      "text",
    )
    .option("--output <path>", "write report to a file")
    .option(
      "--profile <profile>",
      "rule profile: recommended, strict, indie, agency",
      "recommended",
    )
    .option(
      "--fail-on <severity>",
      "minimum severity that exits 1: critical, high, medium, low, none",
      "high",
    )
    .option("--cwd <path>", "working directory to scan", process.cwd())
    .action(async (rawOptions: CheckOptions) => {
      const options = normalizeOptions(rawOptions);
      const cwd = resolve(options.cwd);
      const config = loadConfig(cwd);
      config.profile = options.profile;
      config.scan.mode = options.mode;
      const context = await createScanContext({
        cwd,
        mode: options.mode,
        source: "cli",
        config,
      });
      const findings = await new RuleEngine(builtInRules).run(context);
      const report = renderReport(options.format, findings, context.warnings);

      if (options.output) {
        const outputPath = resolve(cwd, options.output);
        mkdirSync(dirname(outputPath), { recursive: true });
        writeFileSync(outputPath, report);
      }

      process.stdout.write(report);
      if (shouldFail(findings, options.failOn)) {
        process.exitCode = 1;
      }
    });
}

function normalizeOptions(options: CheckOptions): CheckOptions {
  assertValue(options.mode, ["full", "diff", "staged"], "--mode");
  assertValue(
    options.format,
    ["text", "markdown", "json", "sarif"],
    "--format",
  );
  assertValue(
    options.profile,
    ["recommended", "strict", "indie", "agency"],
    "--profile",
  );
  assertValue(
    options.failOn,
    ["critical", "high", "medium", "low", "none"],
    "--fail-on",
  );
  return options;
}

function renderReport(
  format: OutputFormat,
  findings: Parameters<typeof renderTextReport>[0],
  warnings: string[],
): string {
  if (format === "markdown") {
    return renderMarkdownReport(findings, warnings);
  }
  if (format === "json") {
    return renderJsonReport(findings, warnings);
  }
  if (format === "sarif") {
    return renderSarifReport(findings, warnings);
  }
  return renderTextReport(findings, warnings);
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
