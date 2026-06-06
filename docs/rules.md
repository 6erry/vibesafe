# Rules

VibeSafe ships best-effort checks for common AI-assisted development mistakes.

| Rule | Severity | Purpose |
|---|---|---|
| `secrets.no-env-commit` | high/critical | Detect `.env` files and private key files. |
| `secrets.api-key-pattern` | high/critical | Detect common API key formats with masked evidence. |
| `firebase.public-read-write` | high | Detect `allow read, write: if true;`. |
| `supabase.rls-disabled` | high | Detect migrations disabling row level security. |
| `supabase.service-role-client` | critical | Detect service-role keys exposed to browser code. |
| `stripe.webhook-no-signature` | high | Detect webhook handlers missing `constructEvent`. |
| `stripe.secret-key-client` | critical | Detect Stripe secret keys in frontend code. |
| `cors.wildcard-origin` | medium | Detect `origin: "*"` and wildcard CORS headers. |
| `api.admin-no-auth` | medium/high | Detect admin-like APIs without obvious auth signals. |
| `github-actions.invalid-workflow-yaml` | medium | Detect workflow YAML files that cannot be parsed. |
| `github-actions.overprivileged-permissions` | medium/high | Detect broad workflow permissions. |
| `github-actions.pull-request-target-risk` | medium/high | Detect risky `pull_request_target` usage. |
| `github-actions.unpinned-action` | medium | Detect mutable action refs. |
| `diff.large-change` | medium | Detect large diffs that deserve manual review. |
| `diff.deletes-auth-checks` | high | Detect removed auth, permission, policy, or guard lines in diffs. |
| `diff.deletes-tests` | medium | Detect deleted test files or large test deletions in diffs. |

These rules are intentionally conservative static checks. Review every finding manually.

List the active built-in rules for a profile:

```bash
vibesafe rules --profile strict
vibesafe rules --format json
```
