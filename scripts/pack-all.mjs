import { execFileSync } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptsDir);
const packDestination = join("tmp", "pack-inspect");
const pnpm = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

rmSync(join(repoRoot, packDestination), { recursive: true, force: true });
mkdirSync(join(repoRoot, packDestination), { recursive: true });

execFileSync(pnpm, ["build"], { cwd: repoRoot, stdio: "inherit" });

for (const packageName of [
  "@6erry/vibesafe-core",
  "@6erry/vibesafe-claude-hook",
  "@6erry/vibesafe",
  "@6erry/vibesafe-github-action",
]) {
  execFileSync(
    pnpm,
    ["--filter", packageName, "pack", "--pack-destination", packDestination],
    { cwd: repoRoot, stdio: "inherit" },
  );
}
