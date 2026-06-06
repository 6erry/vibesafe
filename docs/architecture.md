# Architecture

VibeSafe is organized around a shared core package:

```text
packages/core          Rule engine, scanner, reports, built-in rules
packages/cli           User-facing CLI
packages/github-action GitHub Action entrypoint
packages/claude-hook   Claude Code hook decision helpers
packages/gemini-extension Starter Gemini CLI extension files
```

All integrations should call `@6erry/vibesafe-core` instead of duplicating scanning
or rule logic.
