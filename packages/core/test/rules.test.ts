import { describe, expect, it } from "vitest";
import {
  builtInRules,
  defaultConfig,
  mergeConfig,
  RuleEngine,
  renderJsonReport,
  renderMarkdownReport,
  renderSarifReport,
  type ScanContext,
  type ScannedFile,
  shouldFail,
} from "../src";

describe("built-in rules", () => {
  it("detects sensitive env/key files", async () => {
    const findings = await runWithFiles([
      file(".env.local", "OPENAI_API_KEY=sk-proj-exampleplaceholder"),
    ]);

    expect(
      findings.some((finding) => finding.ruleId === "secrets.no-env-commit"),
    ).toBe(true);
  });

  it("detects and masks API key patterns", async () => {
    const findings = await runWithFiles([
      file(
        "src/server.ts",
        "const key = 'ghp_abcdefghijklmnopqrstuvwxyzABCDEF123456';",
      ),
    ]);
    const finding = findings.find(
      (item) => item.ruleId === "secrets.api-key-pattern",
    );

    expect(finding).toBeDefined();
    expect(finding?.evidence).toContain("************");
    expect(finding?.evidence).not.toContain(
      "abcdefghijklmnopqrstuvwxyzABCDEF123456",
    );
  });

  it("detects Firebase public read/write rules", async () => {
    const findings = await runWithFiles([
      file("firestore.rules", "allow read, write: if true;"),
    ]);

    expect(findings.map((finding) => finding.ruleId)).toContain(
      "firebase.public-read-write",
    );
  });

  it("detects Supabase RLS being disabled", async () => {
    const findings = await runWithFiles([
      file(
        "supabase/migrations/001.sql",
        "alter table profiles disable row level security;",
      ),
    ]);

    expect(findings.map((finding) => finding.ruleId)).toContain(
      "supabase.rls-disabled",
    );
  });

  it("detects Supabase service role variables exposed to client", async () => {
    const findings = await runWithFiles([
      file(
        "src/supabaseClient.ts",
        "const key = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;",
      ),
    ]);

    expect(findings.map((finding) => finding.ruleId)).toContain(
      "supabase.service-role-client",
    );
  });

  it("detects Stripe webhook handlers without signature verification", async () => {
    const findings = await runWithFiles([
      file(
        "src/app/api/stripe/webhook/route.ts",
        "export async function POST(req: Request) { const event = await req.json(); }",
      ),
    ]);

    expect(findings.map((finding) => finding.ruleId)).toContain(
      "stripe.webhook-no-signature",
    );
  });

  it("detects wildcard CORS", async () => {
    const findings = await runWithFiles([
      file("src/api.ts", "app.use(cors({ origin: '*' }));"),
    ]);

    expect(findings.map((finding) => finding.ruleId)).toContain(
      "cors.wildcard-origin",
    );
  });

  it("detects dangerous GitHub Actions workflows", async () => {
    const findings = await runWithFiles([
      file(
        ".github/workflows/unsafe.yml",
        `on: pull_request_target
permissions: write-all
jobs:
  test:
    steps:
      - uses: actions/checkout@main
      - run: npm test
`,
      ),
    ]);

    expect(findings.map((finding) => finding.ruleId)).toContain(
      "github-actions.overprivileged-permissions",
    );
    expect(findings.map((finding) => finding.ruleId)).toContain(
      "github-actions.pull-request-target-risk",
    );
    expect(findings.map((finding) => finding.ruleId)).toContain(
      "github-actions.unpinned-action",
    );
  });

  it("detects invalid GitHub Actions workflow YAML", async () => {
    const findings = await runWithFiles([
      file(
        ".github/workflows/broken.yml",
        `name: broken
jobs:
  test:
    runs-on: ubuntu-latest
      bad-indent: true
`,
      ),
    ]);

    expect(findings.map((finding) => finding.ruleId)).toContain(
      "github-actions.invalid-workflow-yaml",
    );
  });

  it("renders reports and fail-on decisions", async () => {
    const findings = await runWithFiles([
      file("firestore.rules", "allow read, write: if true;"),
    ]);

    expect(renderMarkdownReport(findings)).toContain("VibeSafe Report");
    expect(renderJsonReport(findings)).toContain("firebase.public-read-write");
    expect(renderSarifReport(findings)).toContain('"version": "2.1.0"');
    expect(shouldFail(findings, "high")).toBe(true);
    expect(shouldFail(findings, "critical")).toBe(false);
  });

  it("detects deleted auth checks in diffs", async () => {
    const findings = await runWithContext({
      ...context([]),
      mode: "diff",
      diff: {
        mode: "diff",
        changedFiles: ["src/api/admin.ts"],
        stats: [{ path: "src/api/admin.ts", additions: 1, deletions: 1 }],
        raw: `diff --git a/src/api/admin.ts b/src/api/admin.ts
@@ -8,2 +8,1 @@
-  requireAuth(request);
+  return deleteUser(id);
`,
      },
    });

    expect(findings.map((finding) => finding.ruleId)).toContain(
      "diff.deletes-auth-checks",
    );
    expect(
      findings.find((finding) => finding.ruleId === "diff.deletes-auth-checks")
        ?.file,
    ).toBe("src/api/admin.ts");
  });

  it("detects large test deletions in diffs", async () => {
    const findings = await runWithContext({
      ...context([]),
      mode: "diff",
      diff: {
        mode: "diff",
        changedFiles: ["src/auth.test.ts"],
        stats: [{ path: "src/auth.test.ts", additions: 0, deletions: 80 }],
        raw: "",
      },
    });

    expect(findings.map((finding) => finding.ruleId)).toContain(
      "diff.deletes-tests",
    );
  });

  it("applies warn levels by downgrading high findings to medium", async () => {
    const findings = await runWithContext({
      ...context([file("firestore.rules", "allow read, write: if true;")]),
      config: mergeConfig({
        profile: "recommended",
        rules: {
          "firebase.public-read-write": "warn",
        },
      }),
    });

    expect(
      findings.find(
        (finding) => finding.ruleId === "firebase.public-read-write",
      )?.severity,
    ).toBe("medium");
    expect(shouldFail(findings, "high")).toBe(false);
  });

  it("skips rules configured as off", async () => {
    const findings = await runWithContext({
      ...context([file("firestore.rules", "allow read, write: if true;")]),
      config: mergeConfig({
        rules: {
          "firebase.public-read-write": "off",
        },
      }),
    });

    expect(findings.map((finding) => finding.ruleId)).not.toContain(
      "firebase.public-read-write",
    );
  });

  it("supports inline ignore comments", async () => {
    const findings = await runWithFiles([
      file(
        "firestore.rules",
        `// vibesafe-ignore-next-line firebase.public-read-write
allow read, write: if true;`,
      ),
    ]);

    expect(findings.map((finding) => finding.ruleId)).not.toContain(
      "firebase.public-read-write",
    );
  });
});

async function runWithFiles(files: ScannedFile[]) {
  return runWithContext(context(files));
}

async function runWithContext(scanContext: ScanContext) {
  return new RuleEngine(builtInRules).run(scanContext);
}

function context(files: ScannedFile[]): ScanContext {
  return {
    cwd: "/tmp/vibesafe-test",
    mode: "full",
    files,
    packageManager: "unknown",
    frameworks: ["unknown"],
    config: defaultConfig,
    source: "cli",
    warnings: [],
  };
}

function file(path: string, content: string): ScannedFile {
  return {
    path,
    absolutePath: `/tmp/vibesafe-test/${path}`,
    content,
    size: Buffer.byteLength(content),
  };
}
