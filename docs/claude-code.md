# Claude Code Hook

Create a hook template:

```bash
vibesafe init --claude
```

The generated `.claude/settings.json` calls:

```bash
npx @6erry/vibesafe hook claude-pre
```

The initial hook blocks obvious dangerous operations such as reading `.env`,
running `rm -rf`, `git reset --hard`, `git clean -fd`, and warns for production-like
operations such as `firebase deploy`, `npm publish`, and `git push`.
