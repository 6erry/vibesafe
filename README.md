# VibeSafe

**Can you publish that AI-generated code as-is?**

VibeSafe is a best-effort safety checker for AI-assisted development. It scans
repository files and diffs for common release risks: leaked `.env` files, API
keys, permissive Firebase/Supabase rules, Stripe webhook mistakes, wildcard
CORS, risky GitHub Actions, and large suspicious diffs.

> VibeSafe is not a replacement for professional security audits, threat
> modeling, or code review. Always review findings manually before making
> security decisions.

## Quick Start

Requires Node.js 22.13 or newer.

```bash
npx @6erry/vibesafe check --mode full
```

From this repository:

```bash
npx pnpm@11.5.2 install
npx pnpm@11.5.2 build
node packages/cli/dist/index.js check --mode full
```

Run the local smoke test:

```bash
npx pnpm@11.5.2 smoke
```

## CLI

```bash
vibesafe check --mode diff
vibesafe check --mode staged --format markdown --output vibesafe-report.md
vibesafe check --mode full --format json --fail-on medium
vibesafe check --mode diff --format sarif --output vibesafe.sarif
vibesafe rules --profile strict
vibesafe init --github-action --claude
vibesafe doctor
```

## GitHub Action

```yaml
name: VibeSafe

on:
  pull_request:
    branches: [main]

permissions:
  contents: read
  pull-requests: write

jobs:
  vibesafe:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: 6erry/vibesafe@v1
        with:
          mode: diff
          fail-on: high
          comment: true
          github-token: ${{ github.token }}
```

## Claude Code Hook

```bash
vibesafe init --claude
```

This creates a `.claude/settings.json` template that calls:

```bash
npx @6erry/vibesafe hook claude-pre
```

The hook blocks obvious dangerous reads and commands such as reading `.env`
files, `rm -rf`, `git reset --hard`, `firebase deploy`, and `npm publish`.

## Supported Checks

- `secrets.no-env-commit`
- `secrets.api-key-pattern`
- `firebase.public-read-write`
- `supabase.rls-disabled`
- `supabase.service-role-client`
- `stripe.webhook-no-signature`
- `stripe.secret-key-client`
- `cors.wildcard-origin`
- `api.admin-no-auth`
- `github-actions.invalid-workflow-yaml`
- `github-actions.overprivileged-permissions`
- `github-actions.pull-request-target-risk`
- `github-actions.unpinned-action`
- `diff.large-change`
- `diff.deletes-auth-checks`
- `diff.deletes-tests`

See [docs/rules.md](docs/rules.md) for details.

## Roadmap

- v0.1: CLI, core rules, Markdown/JSON reports
- v0.2: GitHub Action PR comments
- v0.3: Claude Code hooks
- v0.4: Gemini CLI extension
- v0.5: MCP proxy prototype

## License

MIT
