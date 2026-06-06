#!/usr/bin/env node
import { Command } from "commander";
import { registerCheckCommand } from "./commands/check";
import { registerDoctorCommand } from "./commands/doctor";
import { registerHookCommand } from "./commands/hook";
import { registerInitCommand } from "./commands/init";
import { registerRulesCommand } from "./commands/rules";

const program = new Command();

program
  .name("vibesafe")
  .description("Best-effort safety checks for AI-assisted development.")
  .version("0.1.0");

registerCheckCommand(program);
registerInitCommand(program);
registerDoctorCommand(program);
registerHookCommand(program);
registerRulesCommand(program);

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`VibeSafe error: ${message}`);
  process.exitCode = 1;
});
