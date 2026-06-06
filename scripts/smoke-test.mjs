import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(scriptsDir);
const fixtureRoot = join(repoRoot, "tmp", "vibesafe-smoke-bad-app");
const cli = join(repoRoot, "packages", "cli", "dist", "index.js");

rmSync(fixtureRoot, { recursive: true, force: true });

write(
  join(fixtureRoot, "package.json"),
  JSON.stringify({ name: "vibesafe-smoke-bad-app", private: true }, null, 2),
);
write(
  join(fixtureRoot, ".vibesafe.yml"),
  `version: 1
profile: strict

scan:
  mode: full
  include:
    - "**/*"
  exclude:
    - "node_modules/**"

rules:
  cors.wildcard-origin: off
  firebase.public-read-write: warn
`,
);
write(
  join(fixtureRoot, ".env.local"),
  `STRIPE_SECRET_KEY=sk_test_1234567890ABCDEFGHIJKLMNOP
GITHUB_TOKEN=ghp_abcdefghijklmnopqrstuvwxyzABCDEF123456
`,
);
write(
  join(fixtureRoot, "firestore.rules"),
  `rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /ignored/{document=**} {
      // vibesafe-ignore-next-line firebase.public-read-write
      allow read, write: if true;
    }

    match /public/{document=**} {
      allow read, write: if true;
    }
  }
}
`,
);
write(
  join(fixtureRoot, "supabase", "migrations", "001_disable_rls.sql"),
  "alter table public.profiles disable row level security;\n",
);
write(
  join(fixtureRoot, "src", "lib", "supabaseClient.ts"),
  `export const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
`,
);
write(
  join(fixtureRoot, "src", "lib", "cors.ts"),
  `export const cors = { origin: "*" };
`,
);
write(
  join(fixtureRoot, "src", "app", "api", "stripe", "webhook", "route.ts"),
  `export async function POST(request: Request) {
  const event = await request.json();
  return Response.json({ received: Boolean(event) });
}
`,
);
write(
  join(fixtureRoot, "src", "app", "api", "admin", "users", "route.ts"),
  `export async function DELETE() {
  await deleteUser("user_123");
  return Response.json({ ok: true });
}

async function deleteUser(userId: string) {
  console.log(userId);
}
`,
);
write(
  join(fixtureRoot, "src", "lib", "stripeClient.ts"),
  "export const stripeSecret = import.meta.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;\n",
);
write(
  join(fixtureRoot, ".github", "workflows", "unsafe.yml"),
  `name: unsafe

on: pull_request_target

permissions: write-all

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
      - run: npm install
      - run: npm test
`,
);
write(
  join(fixtureRoot, ".github", "workflows", "broken.yml"),
  `name: broken
jobs:
  test:
    runs-on: ubuntu-latest
      bad-indent: true
`,
);

execFileSync(
  "node",
  [
    cli,
    "check",
    "--cwd",
    fixtureRoot,
    "--mode",
    "full",
    "--format",
    "json",
    "--output",
    "vibesafe-report.json",
    "--fail-on",
    "none",
  ],
  {
    cwd: repoRoot,
    stdio: "pipe",
  },
);

const report = JSON.parse(
  readFileSync(join(fixtureRoot, "vibesafe-report.json"), "utf8"),
);
const rules = report.findings.map((finding) => finding.ruleId);
const firebaseFindings = report.findings.filter(
  (finding) => finding.ruleId === "firebase.public-read-write",
);
const requiredRules = [
  "secrets.no-env-commit",
  "secrets.api-key-pattern",
  "supabase.rls-disabled",
  "supabase.service-role-client",
  "stripe.webhook-no-signature",
  "stripe.secret-key-client",
  "api.admin-no-auth",
  "github-actions.invalid-workflow-yaml",
  "github-actions.overprivileged-permissions",
  "github-actions.pull-request-target-risk",
  "github-actions.unpinned-action",
];

for (const ruleId of requiredRules) {
  assert(rules.includes(ruleId), `Expected ${ruleId} to be detected`);
}

assert(
  !rules.includes("cors.wildcard-origin"),
  "CORS rule should be disabled by fixture config",
);
assert(
  firebaseFindings.length === 1,
  "Ignored Firebase finding should not be reported",
);
assert(
  firebaseFindings[0]?.severity === "medium",
  "Firebase warn override should downgrade severity to medium",
);
assert(
  !report.findings.some((finding) =>
    finding.file?.startsWith("vibesafe-report."),
  ),
  "Report files should not be scanned",
);

console.log(
  JSON.stringify(
    {
      fixture: fixtureRoot,
      total: report.summary.total,
      critical: report.summary.counts.critical,
      high: report.summary.counts.high,
      medium: report.summary.counts.medium,
    },
    null,
    2,
  ),
);

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
