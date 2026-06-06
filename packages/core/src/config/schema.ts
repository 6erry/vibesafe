import type { RuleLevel, RuleProfile, VibeSafeConfig } from "../types";

export const defaultExcludePatterns = [
  "node_modules/**",
  ".git/**",
  ".next/**",
  "dist/**",
  "build/**",
  "coverage/**",
  ".turbo/**",
  "vibesafe-report.*",
];

export const profileRuleDefaults: Record<
  RuleProfile,
  Record<string, RuleLevel>
> = {
  recommended: {
    "secrets.no-env-commit": "error",
    "secrets.api-key-pattern": "warn",
    "firebase.public-read-write": "error",
    "supabase.rls-disabled": "error",
    "supabase.service-role-client": "error",
    "stripe.webhook-no-signature": "error",
    "stripe.secret-key-client": "error",
    "cors.wildcard-origin": "warn",
    "api.admin-no-auth": "warn",
    "github-actions.invalid-workflow-yaml": "warn",
    "github-actions.overprivileged-permissions": "warn",
    "github-actions.pull-request-target-risk": "error",
    "github-actions.unpinned-action": "warn",
    "diff.large-change": "warn",
    "diff.deletes-auth-checks": "error",
    "diff.deletes-tests": "warn",
  },
  strict: {
    "secrets.no-env-commit": "error",
    "secrets.api-key-pattern": "error",
    "firebase.public-read-write": "error",
    "supabase.rls-disabled": "error",
    "supabase.service-role-client": "error",
    "stripe.webhook-no-signature": "error",
    "stripe.secret-key-client": "error",
    "cors.wildcard-origin": "error",
    "api.admin-no-auth": "error",
    "github-actions.invalid-workflow-yaml": "error",
    "github-actions.overprivileged-permissions": "error",
    "github-actions.pull-request-target-risk": "error",
    "github-actions.unpinned-action": "warn",
    "diff.large-change": "warn",
    "diff.deletes-auth-checks": "error",
    "diff.deletes-tests": "error",
  },
  indie: {
    "secrets.no-env-commit": "error",
    "secrets.api-key-pattern": "warn",
    "firebase.public-read-write": "error",
    "supabase.rls-disabled": "warn",
    "supabase.service-role-client": "error",
    "stripe.webhook-no-signature": "error",
    "stripe.secret-key-client": "error",
    "cors.wildcard-origin": "warn",
    "api.admin-no-auth": "warn",
    "github-actions.invalid-workflow-yaml": "warn",
    "github-actions.overprivileged-permissions": "warn",
    "github-actions.pull-request-target-risk": "error",
    "github-actions.unpinned-action": "warn",
    "diff.large-change": "warn",
    "diff.deletes-auth-checks": "warn",
    "diff.deletes-tests": "warn",
  },
  agency: {
    "secrets.no-env-commit": "error",
    "secrets.api-key-pattern": "error",
    "firebase.public-read-write": "error",
    "supabase.rls-disabled": "error",
    "supabase.service-role-client": "error",
    "stripe.webhook-no-signature": "error",
    "stripe.secret-key-client": "error",
    "cors.wildcard-origin": "warn",
    "api.admin-no-auth": "error",
    "github-actions.invalid-workflow-yaml": "error",
    "github-actions.overprivileged-permissions": "error",
    "github-actions.pull-request-target-risk": "error",
    "github-actions.unpinned-action": "warn",
    "diff.large-change": "warn",
    "diff.deletes-auth-checks": "error",
    "diff.deletes-tests": "warn",
  },
};

export const defaultConfig: VibeSafeConfig = {
  version: 1,
  profile: "recommended",
  scan: {
    mode: "diff",
    include: ["**/*"],
    exclude: defaultExcludePatterns,
  },
  rules: profileRuleDefaults.recommended,
  agent: {
    block: ["read_env_files", "destructive_commands"],
    requireApproval: [
      "git_push",
      "npm_publish",
      "firebase_deploy",
      "production_deploy",
    ],
  },
};

export function mergeConfig(partial: unknown): VibeSafeConfig {
  if (!partial || typeof partial !== "object") {
    return structuredClone(defaultConfig);
  }

  const input = partial as Partial<VibeSafeConfig>;
  const profile = input.profile ?? defaultConfig.profile;
  return {
    version: 1,
    profile,
    scan: {
      mode: input.scan?.mode ?? defaultConfig.scan.mode,
      include: input.scan?.include ?? defaultConfig.scan.include,
      exclude: input.scan?.exclude ?? defaultConfig.scan.exclude,
    },
    rules: {
      ...profileRuleDefaults[profile],
      ...(input.rules ?? {}),
    },
    agent: {
      block: input.agent?.block ?? defaultConfig.agent.block,
      requireApproval:
        input.agent?.requireApproval ?? defaultConfig.agent.requireApproval,
    },
  };
}
