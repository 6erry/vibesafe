import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { configTemplate, type RuleProfile } from "@6erry/vibesafe-core";
import type { Command } from "commander";

interface InitOptions {
  cwd: string;
  profile: RuleProfile;
  githubAction?: boolean;
  claude?: boolean;
  force?: boolean;
}

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Create VibeSafe configuration files.")
    .option("--cwd <path>", "working directory", process.cwd())
    .option("--profile <profile>", "rule profile", "recommended")
    .option("--github-action", "create .github/workflows/vibesafe.yml")
    .option("--claude", "create .claude/settings.json hook template")
    .option("--force", "overwrite existing files")
    .action((options: InitOptions) => {
      assertProfile(options.profile);
      const cwd = resolve(options.cwd);
      writeIfMissing(
        join(cwd, ".vibesafe.yml"),
        configTemplate(options.profile),
        Boolean(options.force),
      );

      if (options.githubAction) {
        writeIfMissing(
          join(cwd, ".github/workflows/vibesafe.yml"),
          githubWorkflowTemplate(),
          Boolean(options.force),
        );
      }

      if (options.claude) {
        writeIfMissing(
          join(cwd, ".claude/settings.json"),
          claudeSettingsTemplate(),
          Boolean(options.force),
        );
      }

      console.log("VibeSafe initialized.");
    });
}

function assertProfile(value: string): asserts value is RuleProfile {
  const allowed = ["recommended", "strict", "indie", "agency"];
  if (!allowed.includes(value)) {
    throw new Error(`--profile must be one of: ${allowed.join(", ")}`);
  }
}

function writeIfMissing(path: string, content: string, force: boolean): void {
  if (existsSync(path) && !force) {
    console.log(`Skipped existing ${path}`);
    return;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`Wrote ${path}`);
}

function githubWorkflowTemplate(): string {
  return `name: VibeSafe

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  vibesafe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: 6erry/vibesafe@v1
        with:
          mode: diff
          fail-on: high
          comment: true
          github-token: \${{ github.token }}
`;
}

function claudeSettingsTemplate(): string {
  return `${JSON.stringify(
    {
      hooks: {
        PreToolUse: [
          {
            matcher: "Bash|Read|Edit|Write|MultiEdit",
            hooks: [
              {
                type: "command",
                command: "npx @6erry/vibesafe hook claude-pre",
              },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: "Edit|Write|MultiEdit",
            hooks: [
              {
                type: "command",
                command: "npx @6erry/vibesafe hook claude-post",
              },
            ],
          },
        ],
      },
    },
    null,
    2,
  )}\n`;
}
