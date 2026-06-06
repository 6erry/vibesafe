# VibeSafe

**AIで作ったコード、そのまま公開して大丈夫？**

VibeSafeは、AI支援開発向けのベストエフォートな安全チェックCLIです。
`.env`漏洩、APIキー、Firebase/Supabaseの危険設定、Stripe webhook署名検証漏れ、
CORS `*`、GitHub Actionsの危険設定、大きすぎる差分などを検出します。

VibeSafeは専門的なセキュリティ監査、脅威モデリング、コードレビューの代替ではありません。
検出結果は必ず人間が確認してください。

## Quick Start

Node.js 22.13 以上が必要です。

```bash
npx @6erry/vibesafe check --mode full
```

このリポジトリで試す場合:

```bash
npx pnpm@11.5.2 install
npx pnpm@11.5.2 build
node packages/cli/dist/index.js check --mode full
```

## 代表的な使い方

```bash
vibesafe check --mode diff
vibesafe check --mode staged --format markdown --output vibesafe-report.md
vibesafe init --github-action --claude
vibesafe doctor
```

詳しくは `docs/` を参照してください。
