import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptsDir);
const packDir = join(repoRoot, "tmp", "pack-inspect");
const appDir = join(repoRoot, "tmp", "pack-install-smoke");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

rmSync(appDir, { recursive: true, force: true });
mkdirSync(appDir, { recursive: true });
writeFileSync(
  join(appDir, "package.json"),
  JSON.stringify(
    { name: "vibesafe-pack-install-smoke", private: true },
    null,
    2,
  ),
);

const tarballs = readdirSync(packDir)
  .filter((file) => file.endsWith(".tgz"))
  .map((file) => join(packDir, file));

for (const expected of [
  "6erry-vibesafe-core-0.1.0.tgz",
  "6erry-vibesafe-claude-hook-0.1.0.tgz",
  "6erry-vibesafe-0.1.0.tgz",
]) {
  if (!tarballs.some((tarball) => tarball.endsWith(expected))) {
    throw new Error(`Missing ${expected}. Run pnpm pack:all first.`);
  }
}

execFileSync(npm, ["install", "--no-audit", "--no-fund", ...tarballs], {
  cwd: appDir,
  stdio: "inherit",
});

const output = execFileSync(
  "node",
  [
    join(appDir, "node_modules", "@6erry", "vibesafe", "dist", "index.js"),
    "rules",
    "--format",
    "json",
  ],
  {
    cwd: appDir,
    encoding: "utf8",
  },
);
const parsed = JSON.parse(output);

if (!Array.isArray(parsed.rules) || parsed.rules.length < 10) {
  throw new Error("Installed VibeSafe CLI did not list built-in rules.");
}

console.log(
  JSON.stringify(
    {
      app: appDir,
      installedTarballs: tarballs.length,
      listedRules: parsed.rules.length,
    },
    null,
    2,
  ),
);
