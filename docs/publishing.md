# Publishing

This project publishes three npm packages for v0.1:

- `@6erry/vibesafe-core`
- `@6erry/vibesafe-claude-hook`
- `@6erry/vibesafe`

The GitHub Action is consumed from the repository via `action.yml`, so its
bundled `packages/github-action/dist/index.js` must be committed for releases.

## Local Checks

Use Node.js 22.13 or newer.

```bash
npx pnpm@11.5.2 install
npx pnpm@11.5.2 lint
npx pnpm@11.5.2 test
npx pnpm@11.5.2 smoke
npx pnpm@11.5.2 pack:all
npx pnpm@11.5.2 pack-install-smoke
```

Inspect generated tarballs in `tmp/pack-inspect`.

## npm Release

Set `NPM_TOKEN` in GitHub Actions secrets, then publish a GitHub Release or run
the `Release` workflow manually.

The workflow publishes packages in dependency order:

1. `@6erry/vibesafe-core`
2. `@6erry/vibesafe-claude-hook`
3. `@6erry/vibesafe`

Update repository URLs and the action usage example before the first public
release.
