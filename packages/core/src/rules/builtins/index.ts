import type { Rule } from "../rule";
import { apiAdminNoAuthRule } from "./auth";
import { corsWildcardOriginRule } from "./cors";
import {
  diffDeletesAuthChecksRule,
  diffDeletesTestsRule,
  diffLargeChangeRule,
} from "./dangerousDiff";
import { firebasePublicReadWriteRule } from "./firebase";
import {
  githubActionsInvalidWorkflowYamlRule,
  githubActionsOverprivilegedPermissionsRule,
  githubActionsPullRequestTargetRiskRule,
  githubActionsUnpinnedActionRule,
} from "./githubActions";
import { apiKeyPatternRule, noEnvCommitRule } from "./secrets";
import {
  stripeSecretKeyClientRule,
  stripeWebhookNoSignatureRule,
} from "./stripe";
import {
  supabaseRlsDisabledRule,
  supabaseServiceRoleClientRule,
} from "./supabase";

export const builtInRules: Rule[] = [
  noEnvCommitRule,
  apiKeyPatternRule,
  firebasePublicReadWriteRule,
  supabaseRlsDisabledRule,
  supabaseServiceRoleClientRule,
  stripeWebhookNoSignatureRule,
  stripeSecretKeyClientRule,
  corsWildcardOriginRule,
  apiAdminNoAuthRule,
  githubActionsInvalidWorkflowYamlRule,
  githubActionsOverprivilegedPermissionsRule,
  githubActionsPullRequestTargetRiskRule,
  githubActionsUnpinnedActionRule,
  diffLargeChangeRule,
  diffDeletesAuthChecksRule,
  diffDeletesTestsRule,
];
