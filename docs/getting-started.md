# Getting Started

Install and run VibeSafe with npx:

```bash
npx @6erry/vibesafe check --mode full
```

For local development in this repository:

```bash
npx pnpm@11.5.2 install
npx pnpm@11.5.2 build
node packages/cli/dist/index.js check --mode full
```

Use `vibesafe init` to create `.vibesafe.yml`.

Reports can be written as text, Markdown, JSON, or SARIF:

```bash
vibesafe check --mode diff --format sarif --output vibesafe.sarif
```

## Smoke Test

This repository includes a generated bad-app fixture for CLI verification:

```bash
npx pnpm@11.5.2 smoke
```

The smoke test creates `tmp/vibesafe-smoke-bad-app`, scans it, and verifies that
configuration overrides, ignore comments, report exclusions, and major built-in
rules work together.
