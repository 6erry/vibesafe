# @6erry/vibesafe-github-action

GitHub Action entrypoint for VibeSafe.

Use the repository action in a workflow:

```yaml
- uses: 6erry/vibesafe@v1
  with:
    mode: diff
    fail-on: high
    comment: true
```
