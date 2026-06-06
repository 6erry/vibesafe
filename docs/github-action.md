# GitHub Action

Use VibeSafe on pull requests:

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
          format: markdown
          github-token: ${{ github.token }}
```

Write SARIF instead:

```yaml
      - uses: 6erry/vibesafe@v1
        with:
          mode: diff
          format: sarif
          output: vibesafe.sarif
          github-token: ${{ github.token }}
```

The action writes a report file and can update an existing VibeSafe PR comment.
PR comments and step summaries stay in Markdown even when `format` is `json` or
`sarif`.
