import {
  type ClaudeHookPayload,
  evaluateClaudePreToolUse,
  renderBlockedMessage,
  renderWarningJson,
} from "@6erry/vibesafe-claude-hook";
import type { Command } from "commander";

export function registerHookCommand(program: Command): void {
  const hook = program.command("hook").description("Run VibeSafe agent hooks.");

  hook
    .command("claude-pre")
    .description("Evaluate a Claude Code PreToolUse hook payload from stdin.")
    .action(async () => {
      const payload = JSON.parse(await readStdin()) as ClaudeHookPayload;
      const decision = evaluateClaudePreToolUse(payload);

      if (decision.action === "block") {
        console.error(renderBlockedMessage(decision));
        process.exitCode = 2;
        return;
      }

      if (decision.action === "warn") {
        process.stdout.write(`${renderWarningJson(decision)}\n`);
      }
    });

  hook
    .command("claude-post")
    .description(
      "Accept a Claude Code PostToolUse payload. Currently a no-op placeholder.",
    )
    .action(async () => {
      await readStdin();
    });
}

async function readStdin(): Promise<string> {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}
