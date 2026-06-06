import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { configFileExists, detectPackageManager } from "@6erry/vibesafe-core";
import type { Command } from "commander";

interface DoctorOptions {
  cwd: string;
}

export function registerDoctorCommand(program: Command): void {
  program
    .command("doctor")
    .description("Check local VibeSafe setup.")
    .option("--cwd <path>", "working directory", process.cwd())
    .action((options: DoctorOptions) => {
      const cwd = resolve(options.cwd);
      const checks = [
        ["Node.js", process.version],
        ["Git", commandVersion("git", ["--version"])],
        ["Package manager", detectPackageManager(cwd)],
        [
          "Repository root",
          commandVersion("git", ["rev-parse", "--show-toplevel"], cwd) ||
            "not a git repository",
        ],
        [".vibesafe.yml", configFileExists(cwd) ? "found" : "missing"],
        [
          "GitHub Action",
          existsSync(join(cwd, ".github/workflows/vibesafe.yml"))
            ? "found"
            : "missing",
        ],
        [
          "Claude hook",
          existsSync(join(cwd, ".claude/settings.json")) ? "found" : "missing",
        ],
      ];

      console.log("VibeSafe Doctor\n");
      for (const [label, value] of checks) {
        console.log(`${label}: ${value}`);
      }
    });
}

function commandVersion(
  command: string,
  args: string[],
  cwd = process.cwd(),
): string | undefined {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}
