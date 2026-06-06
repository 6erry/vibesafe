import { writeFileSync } from "node:fs";
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
import * as core from "@actions/core";
import * as github from "@actions/github";

const marker = "<!-- vibesafe-report -->";

async function run(): Promise<void> {
  const mode = inputEnum<Exclude<ScanMode, "hook">>("mode", [
    "full",
    "diff",
    "staged",
  ]);
  const profile = inputEnum<RuleProfile>("profile", [
    "recommended",
    "strict",
    "indie",
    "agency",
  ]);
  const failOn = inputEnum<FailOn>("fail-on", [
    "critical",
    "high",
    "medium",
    "low",
    "none",
  ]);
  const shouldComment = core.getBooleanInput("comment");
  const output = core.getInput("output") || "vibesafe-report.md";
  const format = inputEnum<"text" | "markdown" | "json" | "sarif">("format", [
    "text",
    "markdown",
    "json",
    "sarif",
  ]);
  const cwd = process.env.GITHUB_WORKSPACE ?? process.cwd();

  const config = loadConfig(cwd);
  config.profile = profile;
  config.scan.mode = mode;
  const context = await createScanContext({
    cwd,
    mode,
    source: "github-action",
    config,
  });
  const findings = await new RuleEngine(builtInRules).run(context);
  const markdownReport = renderMarkdownReport(findings, context.warnings);
  const report = renderReport(format, findings, context.warnings);

  writeFileSync(output, report);
  await core.summary.addRaw(markdownReport).write();

  if (shouldComment && github.context.payload.pull_request) {
    await upsertPullRequestComment(`${marker}\n${markdownReport}`);
  }

  if (shouldFail(findings, failOn)) {
    core.setFailed(`VibeSafe found findings at or above ${failOn}.`);
  }
}

function renderReport(
  format: "text" | "markdown" | "json" | "sarif",
  findings: Parameters<typeof renderMarkdownReport>[0],
  warnings: string[],
): string {
  if (format === "text") {
    return renderTextReport(findings, warnings);
  }
  if (format === "json") {
    return renderJsonReport(findings, warnings);
  }
  if (format === "sarif") {
    return renderSarifReport(findings, warnings);
  }
  return renderMarkdownReport(findings, warnings);
}

async function upsertPullRequestComment(body: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  const pullRequest = github.context.payload.pull_request;
  if (!token || !pullRequest) {
    core.info(
      "Skipping PR comment because GITHUB_TOKEN or pull_request context is unavailable.",
    );
    return;
  }

  const octokit = github.getOctokit(token);
  const { owner, repo } = github.context.repo;
  const issue_number = pullRequest.number;
  const comments = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number,
    per_page: 100,
  });
  const existing = comments.data.find((comment) =>
    comment.body?.includes(marker),
  );

  if (existing) {
    await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existing.id,
      body,
    });
  } else {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body,
    });
  }
}

function inputEnum<T extends string>(name: string, allowed: readonly T[]): T {
  const value = core.getInput(name) as T;
  if (!allowed.includes(value)) {
    throw new Error(`${name} must be one of: ${allowed.join(", ")}`);
  }
  return value;
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
