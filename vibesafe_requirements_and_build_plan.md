# VibeSafe 要件定義・開発プロンプト・全工程

作成日: 2026-06-06  
想定開発者: 個人開発者 / 情報系学生 / AI支援開発者  
プロジェクト仮称: **VibeSafe**  
タグライン: **AIで作ったコード、そのまま公開して大丈夫？**

---

## 0. このドキュメントの目的

このドキュメントは、AI支援開発者向けの安全チェックツール **VibeSafe** を作るための要件定義・実装方針・AI開発プロンプト・公開手順をまとめたものです。

VibeSafe は、単なる「公開前コードチェッカー」ではなく、将来的に以下を統合する **AI開発セーフティツールキット** として設計します。

1. **Post-flight check**: AIが変更した後のコード差分・リポジトリ状態を検査する
2. **Pre-flight check**: AIに作業させる前に危険なプロジェクト状態を検出する
3. **In-flight guard**: Claude Code / Gemini CLI / MCP tool call など、AIエージェント実行中の危険操作を止める
4. **CI / PR guard**: GitHub Action として Pull Request を自動診断する
5. **Report / Dashboard**: チーム利用・就職ポートフォリオ・将来の有料化に使えるレポートを出す

最初のMVPでは、**CLI + GitHub Action + Claude Code hook** までを目標にします。

---

## 1. プロダクト概要

### 1.1 コンセプト

VibeSafe は、AIコーディング時代のための安全チェックツールです。

Cursor、Claude Code、Codex、Gemini CLI、GitHub Copilot、手動コピペなど、どのAIツールを使っていても、最終的にコード差分や設定ファイルはリポジトリに現れます。VibeSafe はその差分・設定・実行操作を検査し、公開前・マージ前・デプロイ前の事故を防ぎます。

### 1.2 解決する課題

AIでコードを書くと、開発速度は上がります。しかし、以下のような事故が起きやすくなります。

- `.env` や APIキーを誤ってコミットする
- Firebase / Supabase のルールが `allow read, write: if true` のように危険になる
- Stripe webhook の署名検証が抜ける
- CORS が `*` になっている
- 管理者APIが認証なしで公開される
- AIが大量のファイルを一括変更して、意図しない破壊的変更をする
- GitHub Actions の `permissions: write-all` や危険な `pull_request_target` を使う
- AIエージェントが `.env.local` を読もうとする
- AIエージェントが `rm -rf` や `firebase deploy` を勝手に実行しようとする

VibeSafe は、これらを **検出・警告・ブロック・レポート化** します。

### 1.3 最初の売り文句

- **AIで作ったアプリ、そのまま公開して大丈夫？**
- **個人開発の公開前チェックを1コマンドで。**
- **AI開発に、シートベルトを。**
- **AIが書いたコードを、マージ前に安全確認。**

---

## 2. 競合・位置づけ

### 2.1 既存ツールと違う点

| 既存ツール | 主な用途 | VibeSafeとの差別化 |
|---|---|---|
| ESLint / Biome | 構文・品質チェック | セキュリティ・公開前事故・AI開発特有の危険に寄せる |
| Snyk / Dependabot | 依存関係脆弱性 | 依存関係だけでなく設定・差分・AI操作も見る |
| GitHub Secret Scanning | Secret漏洩検知 | Secretだけでなく Firebase/Supabase/Stripe/CORS なども見る |
| Codex sandbox / approvals | Codex実行時の制限 | Codex以外も含めた差分チェック・PRチェックを提供 |
| Claude Code permissions/hooks | Claude Code内の権限制御 | ルールエンジンとCLI/GitHub Actionに横展開する |
| GitHub Advanced Security | 企業向けセキュリティ | 個人開発者・学生・小規模チーム向けに軽量化する |

### 2.2 目指すカテゴリ

VibeSafe は以下の中間に位置します。

- AI coding safety
- Developer security toolkit
- Pre-release checklist
- GitHub Action security bot
- Agent guard / MCP guard
- Indie hacker release safety tool

### 2.3 OSSとしての見せ方

このプロジェクトは就職・インターン・発信に使えるよう、OSSとして公開する前提で設計します。

公開時に見せたい技術要素:

- TypeScript monorepo
- CLI設計
- Rule engine
- GitHub Action
- Claude Code hook
- Gemini CLI extension 対応の設計
- MCP proxy 対応の設計
- テスト / CI
- README / docs / examples
- セキュリティ設計
- 英語README

---

## 3. 対象ユーザー

### 3.1 Primary target

#### 個人開発者・学生開発者

- AIでアプリを作っている
- Firebase / Supabase / Next.js / Flutter / Stripe を使う
- セキュリティに詳しくない
- でも公開前に最低限の事故は避けたい
- GitHubでOSSや個人開発を公開したい

### 3.2 Secondary target

#### AI受託開発者・小規模開発会社

- 顧客案件でAIを使ってコードを書く
- 納品前に最低限の危険チェックをしたい
- レポートPDF/Markdownを顧客に見せたい
- チームでルールを共有したい

#### AI開発を教える講座・スクール

- 生徒のAI生成コードの危険設定を検出したい
- Firebase/Supabase/Stripe の典型ミスを自動チェックしたい

#### OSSメンテナー

- AIが出したPRや自動生成PRに危険な変更がないか見たい

---

## 4. スコープ

### 4.1 MVPスコープ

MVPで実装するもの:

1. CLI: `vibesafe check`
2. ルールエンジン
3. Markdown / JSON レポート出力
4. Git diff / staged diff / full repository scan
5. Secret / env / config / framework rules
6. GitHub Action
7. Claude Code hook 最小対応
8. README / docs / sample project

### 4.2 MVPではやらないもの

- Webダッシュボード
- GitHub App の完全実装
- チーム管理
- SSO
- 課金
- 完全な静的解析エンジン
- すべての言語対応
- すべてのAIエディタ対応
- MCP proxy の本格実装
- 自動修正PR

ただし、将来的に追加できるようにアーキテクチャだけ準備します。

---

## 5. システム全体設計

### 5.1 全体像

```text
                +----------------------+
                |      VibeSafe Core   |
                |  Rule Engine / Scan  |
                +----------+-----------+
                           |
        +------------------+-------------------+
        |                  |                   |
+-------v-------+  +-------v--------+  +-------v---------+
| CLI           |  | GitHub Action  |  | Claude Hook     |
| vibesafe check|  | PR Comment     |  | PreToolUse etc. |
+-------+-------+  +-------+--------+  +-------+---------+
        |                  |                   |
        +------------------+-------------------+
                           |
                +----------v-----------+
                | Reports              |
                | terminal/json/md     |
                +----------------------+
```

将来的には以下も追加します。

```text
+-------------------+       +---------------------+
| Gemini Extension  |       | MCP Proxy           |
| /vibesafe:check   |       | tool call filtering |
+-------------------+       +---------------------+

+-------------------+       +---------------------+
| Web Dashboard     |       | GitHub App          |
| reports/history   |       | checks/comments     |
+-------------------+       +---------------------+
```

### 5.2 推奨技術スタック

| 領域 | 推奨 |
|---|---|
| 言語 | TypeScript |
| ランタイム | Node.js 20+ |
| パッケージ管理 | pnpm |
| Monorepo | pnpm workspace / Turborepo optional |
| CLI | commander / cac |
| テスト | Vitest |
| Lint/Format | ESLint + Prettier or Biome |
| Git操作 | simple-git or child_process git command |
| YAML parser | yaml |
| Glob | fast-glob |
| レポート | Markdown + JSON |
| GitHub Action | Node action or composite action |
| Claude Hook | Node CLIをhookから呼ぶ |
| Gemini Extension | later: gemini-extension.json + custom command |
| MCP Proxy | later: @modelcontextprotocol/sdk |

---

## 6. リポジトリ構成

推奨構成:

```text
vibesafe/
  README.md
  README.ja.md
  LICENSE
  package.json
  pnpm-workspace.yaml
  tsconfig.base.json
  .gitignore
  .github/
    workflows/
      ci.yml
      release.yml
  packages/
    core/
      package.json
      src/
        index.ts
        scanner/
          scanContext.ts
          fileCollector.ts
          gitDiff.ts
        rules/
          rule.ts
          ruleEngine.ts
          builtins/
            secrets.ts
            envFiles.ts
            firebase.ts
            supabase.ts
            stripe.ts
            cors.ts
            auth.ts
            githubActions.ts
            dangerousDiff.ts
        report/
          report.ts
          markdown.ts
          json.ts
        config/
          loadConfig.ts
          schema.ts
      test/
    cli/
      package.json
      src/
        index.ts
        commands/
          check.ts
          init.ts
          doctor.ts
    github-action/
      action.yml
      package.json
      src/
        index.ts
    claude-hook/
      package.json
      src/
        preToolUse.ts
        postToolUse.ts
        install.ts
    gemini-extension/
      gemini-extension.json
      commands/
        check.toml
      README.md
    mcp-proxy/
      package.json
      src/
        index.ts
  rules/
    recommended.yml
    strict.yml
    indie.yml
    agency.yml
  examples/
    nextjs-firebase-bad/
    nextjs-supabase-bad/
    stripe-webhook-bad/
  docs/
    getting-started.md
    rules.md
    github-action.md
    claude-code.md
    gemini-cli.md
    roadmap.md
    architecture.md
```

---

## 7. コア概念

### 7.1 ScanContext

スキャン時に必要な情報をまとめるオブジェクト。

```ts
export interface ScanContext {
  cwd: string;
  mode: 'full' | 'diff' | 'staged' | 'hook';
  files: ScannedFile[];
  diff?: GitDiff;
  packageManager?: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown';
  frameworks: FrameworkHint[];
  config: VibeSafeConfig;
  source: 'cli' | 'github-action' | 'claude-hook' | 'gemini-extension' | 'mcp-proxy';
}
```

### 7.2 Finding

検出結果。

```ts
export interface Finding {
  id: string;
  ruleId: string;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: 'secret' | 'config' | 'auth' | 'payment' | 'database' | 'agent' | 'ci' | 'release';
  file?: string;
  line?: number;
  column?: number;
  message: string;
  evidence?: string;
  recommendation: string;
  references?: string[];
  confidence: 'high' | 'medium' | 'low';
}
```

### 7.3 Rule

各チェックルール。

```ts
export interface Rule {
  id: string;
  title: string;
  description: string;
  defaultSeverity: Finding['severity'];
  category: Finding['category'];
  appliesTo?: string[];
  run(context: ScanContext): Promise<Finding[]> | Finding[];
}
```

### 7.4 設定ファイル

`.vibesafe.yml` をプロジェクトルートに置けるようにします。

```yaml
version: 1
profile: recommended

scan:
  mode: diff
  include:
    - "**/*"
  exclude:
    - "node_modules/**"
    - ".next/**"
    - "dist/**"
    - "build/**"

rules:
  secrets.no-env-commit: error
  firebase.public-read-write: error
  supabase.rls-disabled: warn
  stripe.webhook-no-signature: error
  cors.wildcard-origin: warn
  github-actions.overprivileged-permissions: warn

agent:
  block:
    - read_env_files
    - destructive_commands
    - production_deploy
  requireApproval:
    - git_push
    - npm_publish
    - firebase_deploy
    - database_migration
```

---

## 8. 機能要件

## 8.1 CLI

### 8.1.1 `vibesafe check`

基本コマンド。

```bash
npx vibesafe check
```

オプション:

```bash
vibesafe check --mode full
vibesafe check --mode diff
vibesafe check --mode staged
vibesafe check --format markdown
vibesafe check --format json
vibesafe check --output vibesafe-report.md
vibesafe check --profile strict
vibesafe check --fail-on high
vibesafe check --no-ai
```

出力例:

```text
VibeSafe Report

Critical: 0
High: 2
Medium: 3
Low: 4

HIGH  secrets.no-env-commit
.env.local is included in git diff.
Recommendation: Remove it from git and add it to .gitignore.

HIGH  firebase.public-read-write
firestore.rules allows public read/write access.
Recommendation: Require authentication and resource ownership checks.
```

### 8.1.2 `vibesafe init`

設定ファイルを生成。

```bash
vibesafe init
```

生成物:

```text
.vibesafe.yml
.github/workflows/vibesafe.yml optional
.claude/settings.json optional
```

### 8.1.3 `vibesafe doctor`

ローカル環境診断。

```bash
vibesafe doctor
```

確認内容:

- Node.js version
- Git installed
- package manager
- repository root
- `.vibesafe.yml`
- GitHub Action config
- Claude Code hook config

---

## 8.2 GitHub Action

### 8.2.1 目的

Pull Request ごとに VibeSafe を実行し、危険な変更をPR上にコメントする。

### 8.2.2 workflow例

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
      - uses: yourname/vibesafe-action@v1
        with:
          mode: diff
          fail-on: high
          comment: true
```

GitHub Actions のカスタムアクションは `action.yml` または `action.yaml` のメタデータファイルを使う必要があります。公式ドキュメントでは `action.yml` が推奨形式とされています。

### 8.2.3 Action inputs

```yaml
inputs:
  mode:
    description: Scan mode: full, diff, staged
    required: false
    default: diff
  profile:
    description: Rule profile: recommended, strict, indie, agency
    required: false
    default: recommended
  fail-on:
    description: Minimum severity to fail the workflow
    required: false
    default: high
  comment:
    description: Whether to comment on PR
    required: false
    default: "true"
  output:
    description: Output report file path
    required: false
    default: vibesafe-report.md
```

### 8.2.4 PRコメント例

```md
## VibeSafe Report

Found 2 high-risk issues and 3 medium-risk issues.

### High

- `secrets.no-env-commit`: `.env.local` appears in this PR.
- `firebase.public-read-write`: `firestore.rules` allows public read/write.

### Recommended actions

1. Remove `.env.local` from the repository and rotate exposed keys.
2. Replace public Firestore rules with authenticated ownership checks.
```

---

## 8.3 Claude Code hook

### 8.3.1 目的

Claude Code のツール実行前・実行後に VibeSafe を呼び、危険操作をブロックまたは警告する。

Claude Code hooks は `PreToolUse`、`PostToolUse`、`Stop` などのイベントで発火し、hookにJSONが渡されます。`PreToolUse`では exit code 2 を使うことでツール呼び出しをブロックできます。

### 8.3.2 ブロック対象

- `.env`, `.env.local`, `.pem`, `id_rsa` などの読み取り
- `rm -rf`, `del /s`, `Remove-Item -Recurse` などの破壊的コマンド
- `git push`
- `npm publish`
- `firebase deploy`
- `supabase db reset`
- `prisma migrate deploy`
- 本番環境らしきURLやDBへの操作
- 大量ファイル削除

### 8.3.3 Claude hook設定例

`.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash|Read|Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "npx vibesafe hook claude-pre"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "npx vibesafe hook claude-post"
          }
        ]
      }
    ]
  }
}
```

### 8.3.4 hook入力例

Claude Code の `PreToolUse` では、以下のようなJSONが標準入力で渡される想定です。

```json
{
  "session_id": "abc123",
  "cwd": "/home/user/my-project",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "firebase deploy --only functions"
  }
}
```

### 8.3.5 ブロック出力例

```text
Blocked by VibeSafe: production deployment requires explicit approval.
Command: firebase deploy --only functions
Rule: agent.production-deploy
```

---

## 8.4 Gemini CLI extension

### 8.4.1 目的

Gemini CLIユーザーが簡単に VibeSafe を呼べるようにする。

Gemini CLI extensions は prompts、MCP servers、custom commands などをパッケージ化して共有でき、GitHub URLやローカルパスからインストールできます。extensions は `<home>/.gemini/extensions` に配置され、`gemini-extension.json` を持ちます。

### 8.4.2 最初の提供内容

- `/vibesafe:check`
- `/vibesafe:explain`
- `/vibesafe:init`

### 8.4.3 構成例

```text
packages/gemini-extension/
  gemini-extension.json
  commands/
    check.toml
    explain.toml
    init.toml
```

### 8.4.4 `gemini-extension.json` 例

```json
{
  "name": "vibesafe",
  "version": "0.1.0",
  "description": "Safety checks for AI-assisted development",
  "commands": {
    "check": "commands/check.toml",
    "explain": "commands/explain.toml"
  }
}
```

---

## 8.5 MCP proxy / MCP guard（Phase 4以降）

### 8.5.1 目的

MCP tool call の前に VibeSafe を挟み、危険な tool invocation を拒否・警告・ログ化する。

MCPのToolsは、サーバーが実行可能な機能をクライアントに公開し、LLMがそれらを呼び出して外部システムに作用できる仕組みです。tools/list で発見し、tools/call で実行されるため、proxy を挟むことでツール呼び出し単位の制御が可能になります。

### 8.5.2 構成

```text
AI Client / Agent
      ↓
VibeSafe MCP Proxy
      ↓
Actual MCP Server
```

### 8.5.3 最初に制御するもの

- file system tools
- shell tools
- GitHub tools
- database tools
- browser automation tools
- email/calendar tools

### 8.5.4 ルール例

```yaml
mcp:
  servers:
    github:
      allow:
        - issues.list
        - pull_requests.read
      requireApproval:
        - pull_requests.merge
        - repos.delete
      deny:
        - secrets.read
    filesystem:
      deny:
        - read:/home/**/.ssh/**
        - read:**/.env*
      requireApproval:
        - write:**/*
```

---

## 9. ルール要件

## 9.1 Secret / env rules

### 9.1.1 `secrets.no-env-commit`

検出:

- `.env`
- `.env.local`
- `.env.production`
- `.env.development.local`
- `.pem`
- `.key`
- `id_rsa`
- `serviceAccountKey.json`

Severity: high / critical

Recommendation:

- Remove from git
- Add to `.gitignore`
- Rotate exposed keys
- Use `.env.example`

### 9.1.2 `secrets.api-key-pattern`

検出候補:

- OpenAI keys
- Anthropic keys
- Firebase private keys
- Stripe secret keys
- GitHub tokens
- AWS keys
- Supabase service role keys

実装:

- regex
- entropy check
- allowlist for test keys

---

## 9.2 Firebase rules

### 9.2.1 `firebase.public-read-write`

検出:

```js
allow read, write: if true;
allow read: if true;
allow write: if true;
```

Severity: high

### 9.2.2 `firebase.no-auth-check`

検出:

- `request.auth == null` を許す
- user ownership check がない write rule

Severity: medium / high

### 9.2.3 `firebase.storage-public-write`

検出:

- Storage rulesで認証なしwriteを許可

---

## 9.3 Supabase rules

### 9.3.1 `supabase.rls-disabled`

検出:

```sql
alter table ... disable row level security;
```

Severity: high

### 9.3.2 `supabase.service-role-client`

検出:

- frontend側に `service_role` key を置いている
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` のような環境変数名

Severity: critical

---

## 9.4 Stripe rules

### 9.4.1 `stripe.webhook-no-signature`

検出:

- webhook handlerに `stripe.webhooks.constructEvent` がない
- raw bodyを使わず JSON parse している
- `STRIPE_WEBHOOK_SECRET` が使われていない

Severity: high

### 9.4.2 `stripe.secret-key-client`

検出:

- `sk_live_` や `sk_test_` が frontend code にある
- `NEXT_PUBLIC_STRIPE_SECRET_KEY`

Severity: critical

---

## 9.5 CORS / API rules

### 9.5.1 `cors.wildcard-origin`

検出:

```ts
origin: '*'
Access-Control-Allow-Origin: *
```

Severity: medium

### 9.5.2 `api.admin-no-auth`

検出:

- `/admin` routes に auth middleware がない
- `deleteUser`, `updateRole`, `grantAdmin` などの処理に認可チェックがない

Severity: high

---

## 9.6 GitHub Actions rules

### 9.6.1 `github-actions.overprivileged-permissions`

検出:

```yaml
permissions: write-all
```

Severity: high

### 9.6.2 `github-actions.pull-request-target-risk`

検出:

```yaml
on: pull_request_target
```

かつ、外部PRのコードをcheckoutして実行している可能性。

Severity: high

### 9.6.3 `github-actions.unpinned-action`

検出:

```yaml
uses: some/action@main
uses: some/action@master
```

Severity: medium

---

## 9.7 Dangerous diff rules

### 9.7.1 `diff.large-change`

検出:

- 1回のPRで50ファイル以上変更
- 5000行以上の差分
- package lockが大きく変化

Severity: medium

### 9.7.2 `diff.deletes-auth-checks`

検出:

- `auth`, `permission`, `middleware`, `guard`, `policy` などを含むコードが削除されている

Severity: high

### 9.7.3 `diff.deletes-tests`

検出:

- test fileの大量削除

Severity: medium

---

## 9.8 Agent operation rules

### 9.8.1 `agent.read-env-file`

Claude Code hookで検出:

- Read toolが `.env` 系を読もうとする
- Bashで `cat .env` などを実行しようとする

Action: block

### 9.8.2 `agent.destructive-command`

検出:

- `rm -rf`
- `git reset --hard`
- `git clean -fd`
- `drop database`
- `supabase db reset`
- `firebase firestore:delete`

Action: block or require approval

### 9.8.3 `agent.production-deploy`

検出:

- `firebase deploy`
- `vercel --prod`
- `npm publish`
- `wrangler deploy`
- `supabase db push --linked`

Action: require approval

---

## 10. 非機能要件

### 10.1 速度

- 小規模プロジェクトでは3秒以内
- 中規模プロジェクトでは10秒以内
- GitHub Actionでは60秒以内を目標

### 10.2 安全性

- デフォルトでコードを外部送信しない
- CLIは完全ローカルで動作
- AI API連携はMVPでは行わない
- 解析結果にsecretの全文を出さない
- evidenceはマスクする

例:

```text
sk_live_51N************abcd
```

### 10.3 誤検知対策

- severity と confidence を分ける
- `.vibesafe.yml` でルールを無効化可能
- inline ignore コメントを後で実装

例:

```ts
// vibesafe-ignore-next-line stripe.webhook-no-signature
```

### 10.4 クロスプラットフォーム

- macOS
- Linux
- Windows

Claude hookの実装では、Windowsのshell差異を考慮します。

### 10.5 ライセンス

初期は **MIT** か **Apache-2.0** 推奨。

- MIT: 広がりやすい、簡単
- Apache-2.0: 特許条項があり企業にやや安心

就職・ポートフォリオ重視なら MIT でよいです。

---

## 11. 実装フェーズ

## Phase 0: プロジェクト準備

### 目的

OSSとして公開できる土台を作る。

### 作業

1. GitHubリポジトリ作成
2. pnpm monorepo作成
3. TypeScript設定
4. ESLint/Biome設定
5. Vitest設定
6. README初期版
7. LICENSE追加
8. CI追加

### 完了条件

- `pnpm install` が通る
- `pnpm test` が通る
- `pnpm build` が通る
- READMEにQuick Startがある

---

## Phase 1: Core rule engine

### 目的

CLIやGitHub Actionから共通利用できるルールエンジンを作る。

### 作業

1. `packages/core` 作成
2. `ScanContext` 実装
3. `Finding` 型定義
4. `Rule` インターフェース作成
5. `RuleEngine` 実装
6. ファイル収集
7. Git差分取得
8. Markdown/JSONレポート生成

### 完了条件

- テスト用ファイルを与えるとFindingが返る
- Markdownレポートが生成される
- JSONレポートが生成される

---

## Phase 2: Built-in rules MVP

### 目的

最初に価値が見えるルールを実装する。

### 優先ルール

1. `secrets.no-env-commit`
2. `secrets.api-key-pattern`
3. `firebase.public-read-write`
4. `supabase.rls-disabled`
5. `stripe.webhook-no-signature`
6. `cors.wildcard-origin`
7. `github-actions.overprivileged-permissions`
8. `diff.large-change`

### 完了条件

- `examples/*-bad` で意図通り検出される
- 各ルールにユニットテストがある

---

## Phase 3: CLI

### 目的

ユーザーが1コマンドで使えるようにする。

### 作業

1. `packages/cli` 作成
2. `vibesafe check` 実装
3. `vibesafe init` 実装
4. `vibesafe doctor` 実装
5. npm packageとして実行可能にする

### 完了条件

```bash
pnpm --filter vibesafe-cli build
node packages/cli/dist/index.js check --mode full
```

が動く。

---

## Phase 4: GitHub Action

### 目的

PR上で自動診断できるようにする。

### 作業

1. `packages/github-action` 作成
2. `action.yml` 作成
3. Action inputs実装
4. PR comment機能
5. fail-on severity実装
6. example workflow作成

### 完了条件

- 自分のテストリポジトリでActionが実行される
- PRにMarkdownレポートがコメントされる
- high以上でworkflowをfailにできる

---

## Phase 5: Claude Code hook

### 目的

AIエージェント管理要素を入れる。

### 作業

1. `packages/claude-hook` 作成
2. stdin JSON parse
3. `PreToolUse` 判定
4. Bash command risk detection
5. Read/Edit/Write risk detection
6. exit 2でブロック
7. `.claude/settings.json` 生成コマンド

### 完了条件

- `.env` 読み取りをブロックできる
- `firebase deploy` を警告できる
- `rm -rf` をブロックできる

---

## Phase 6: Gemini CLI extension

### 目的

Gemini CLI利用者が導入しやすい形を作る。

### 作業

1. `packages/gemini-extension` 作成
2. `gemini-extension.json` 作成
3. `/vibesafe:check` command
4. `/vibesafe:explain` command
5. docs作成

### 完了条件

- ローカルextensionとしてGemini CLIに認識される
- `/vibesafe:check` でCLI実行方法を案内できる

---

## Phase 7: MCP proxy prototype

### 目的

将来的なエージェント管理の核を作る。

### 作業

1. MCP SDK調査
2. proxy server最小実装
3. tools/list proxy
4. tools/call proxy
5. allow/denyルール
6. ログ保存

### 完了条件

- サンプルMCP serverへのtools/callを中継できる
- 指定toolをdenyできる

---

## Phase 8: OSS公開・発信

### 目的

就職・発信・将来の収益化につなげる。

### 作業

1. README英語版整備
2. README日本語版整備
3. デモGIF作成
4. Zenn記事作成
5. X投稿スレッド作成
6. GitHub Topics設定
7. Release v0.1.0
8. npm publish

### 完了条件

- GitHubで見ても使い方が分かる
- `npx vibesafe check` が動く
- Zenn記事から導入できる

---

## 12. AIに実装させるためのプロンプト集

以下は、Claude Code / Codex / Gemini CLI / Cursor などに貼って実装を進めるためのプロンプトです。

---

# Prompt 1: プロジェクト初期化

```text
あなたは熟練したTypeScript OSS開発者です。

AI支援開発者向けの安全チェックCLI「VibeSafe」を作ります。
目的は、AIで生成・変更されたコードを公開前・PR前にチェックし、secret漏洩、危険なFirebase/Supabase/Stripe/CORS/GitHub Actions設定、AIエージェントの危険操作を検出することです。

まず、pnpm workspaceのmonorepoを作成してください。

要件:
- Node.js 20+前提
- TypeScript
- pnpm workspace
- packages/core, packages/cli を作成
- Vitestでテスト可能
- BiomeまたはESLint/Prettierを設定
- root package.jsonに build/test/lint scripts
- README.mdの初期版を作成
- LICENSEはMIT
- .gitignoreを適切に作成

この段階では中身は最小でよいですが、今後 packages/github-action, packages/claude-hook, packages/gemini-extension, packages/mcp-proxy を追加しやすい構成にしてください。

実装後、各ファイルの役割を説明してください。
```

---

# Prompt 2: core の型定義とルールエンジン

```text
VibeSafe の packages/core を実装してください。

目的:
AI支援開発者向けの安全チェックツールとして、CLI/GitHub Action/Claude hookから共通利用できるRule Engineを作ることです。

実装するもの:
1. Finding型
2. Rule型
3. ScanContext型
4. RuleEngineクラス
5. runRules(context, rules) 関数
6. Markdown/JSON report generator
7. severityによるソート
8. fail-on判定関数

Findingには以下を含めてください:
- id
- ruleId
- title
- severity: critical/high/medium/low/info
- category: secret/config/auth/payment/database/agent/ci/release
- file, line, column optional
- message
- evidence optional
- recommendation
- references optional
- confidence: high/medium/low

テストも作成してください。
```

---

# Prompt 3: ファイル収集とGit差分取得

```text
VibeSafe coreにファイル収集とGit差分取得機能を実装してください。

要件:
- cwdを基準にスキャンする
- node_modules, .git, dist, build, .next はデフォルト除外
- fast-globを利用してよい
- full mode: 対象ファイルをすべて読む
- diff mode: mainまたはbase branchとの差分ファイルを対象にする
- staged mode: git staged filesを対象にする
- ファイルサイズが大きすぎるものはスキップする
- binary fileはスキップする
- ScannedFile型を作る

Git操作は child_process で git command を呼ぶか、simple-git を使ってください。

テスト可能なように、Git実行部分は抽象化してください。
```

---

# Prompt 4: Secret / env ルール実装

```text
VibeSafeにsecret/env系ルールを実装してください。

実装するルール:
1. secrets.no-env-commit
   - .env, .env.local, .env.production, .env.development.local, *.pem, *.key, id_rsa, serviceAccountKey.json を検出
   - severity highまたはcritical

2. secrets.api-key-pattern
   - OpenAI, Anthropic, Stripe, GitHub token, AWS key, Supabase service role keyらしき文字列を検出
   - evidenceは必ずマスクする
   - テスト用キーやexampleは誤検知しすぎないようにconfidenceを調整

要件:
- ルールは Rule interface に従う
- 各ルールにユニットテストを作る
- evidenceにsecret全文を絶対に出さない
- recommendationを具体的に書く
```

---

# Prompt 5: Firebase / Supabase ルール実装

```text
VibeSafeにFirebase/Supabaseの危険設定検出ルールを実装してください。

Firebase:
- firebase.public-read-write
  - firestore.rules または storage.rules 内の `allow read, write: if true;` を検出
  - `allow read: if true;`, `allow write: if true;` も検出

Supabase:
- supabase.rls-disabled
  - SQLファイル内の `disable row level security` を検出
- supabase.service-role-client
  - NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  - VITE_SUPABASE_SERVICE_ROLE_KEY
  - frontendコード内の service_role keyらしきもの

要件:
- 危険度、message、recommendationを実用的にする
- テストファイルを作る
- examples/nextjs-firebase-bad と examples/nextjs-supabase-bad を作る
```

---

# Prompt 6: Stripe / CORS / APIルール実装

```text
VibeSafeにStripe, CORS, API認証のルールを実装してください。

Stripe:
- stripe.webhook-no-signature
  - webhook routeらしきファイルで stripe.webhooks.constructEvent が使われていない場合に検出
  - raw bodyを使っていない可能性がある場合もmediumで検出
- stripe.secret-key-client
  - sk_live_ / sk_test_ がfrontend側に含まれる場合critical
  - NEXT_PUBLIC_STRIPE_SECRET_KEYなどを検出

CORS:
- cors.wildcard-origin
  - origin: '*' または Access-Control-Allow-Origin: * を検出

API:
- api.admin-no-auth
  - /admin route, deleteUser, updateRole, grantAdmin などを含むファイルで auth/middleware/check が見当たらない場合medium/highで検出

注意:
静的解析は完全ではないので、confidenceを適切に設定してください。
```

---

# Prompt 7: GitHub Actionsルール実装

```text
VibeSafeにGitHub Actions workflowの危険設定検出を実装してください。

対象ファイル:
- .github/workflows/*.yml
- .github/workflows/*.yaml

実装するルール:
1. github-actions.overprivileged-permissions
   - permissions: write-all
   - contents: write, pull-requests: write などが不要に広い場合

2. github-actions.pull-request-target-risk
   - on: pull_request_target を検出
   - checkoutしてスクリプト実行している場合はhigh

3. github-actions.unpinned-action
   - uses: owner/action@main
   - uses: owner/action@master
   - uses: owner/action@latest

要件:
- yaml parserを使う
- 壊れたyamlでも落ちずにwarning findingを返す
- examplesに危険workflowを追加
- テストを書く
```

---

# Prompt 8: CLI実装

```text
VibeSafe CLIを実装してください。

コマンド:
1. vibesafe check
2. vibesafe init
3. vibesafe doctor

check options:
- --mode full|diff|staged default diff
- --format text|markdown|json default text
- --output path
- --profile recommended|strict|indie|agency default recommended
- --fail-on critical|high|medium|low|none default high
- --cwd path

要件:
- terminal出力は見やすく
- findingのseverityごとに集計
- --output指定時にレポート保存
- fail-on以上のfindingがあればexit code 1
- エラー時は分かりやすいメッセージ
- npx vibesafe check で動くpackage設定
```

---

# Prompt 9: GitHub Action実装

```text
VibeSafeをGitHub Actionとして使えるようにしてください。

要件:
- packages/github-action/action.yml を作成
- Node.js actionとして実装
- inputs: mode, profile, fail-on, comment, output
- pull_requestイベントでPRコメントできる
- GitHub tokenは GITHUB_TOKEN を使用
- Markdown reportをartifactまたはworkspaceに保存
- fail-on以上のfindingがあればcore.setFailedする

PRコメントは既存のVibeSafeコメントがあれば更新し、なければ新規作成してください。

READMEにGitHub Action使用例を追加してください。
```

---

# Prompt 10: Claude Code hook実装

```text
VibeSafeのClaude Code hook対応を実装してください。

目的:
Claude CodeのPreToolUse/PostToolUseイベントで、危険操作をブロックまたは警告する。

実装:
- packages/claude-hook を作成
- `vibesafe hook claude-pre` コマンドをCLIに追加
- stdinからJSONを読む
- tool_name, tool_inputを解析
- Bash commandの危険操作を検出
- Read/Edit/Write対象ファイルの危険性を検出
- ブロック時はstderrに理由を書き、exit code 2で終了
- 警告のみの場合はJSONでsystemMessageを返すか、exit 0で処理

ブロック対象:
- .env, .env.local, *.pem, id_rsa の読み取り
- rm -rf
- git reset --hard
- git clean -fd
- firebase deploy
- npm publish
- supabase db reset
- production DB migrateらしきコマンド

また、`vibesafe init --claude` で .claude/settings.json の雛形を生成してください。
```

---

# Prompt 11: README作成

```text
VibeSafeのOSS公開用READMEを作成してください。

READMEに含めるもの:
- プロジェクト名とタグライン
- 何をするツールか
- なぜ必要か
- Quick Start
- CLI usage
- GitHub Action usage
- Claude Code hook usage
- Example report
- Supported checks
- Roadmap
- Contributing
- License

英語READMEをメインにし、README.ja.mdへのリンクも置いてください。

トーン:
- OSSらしく簡潔
- 開発者に刺さる
- セキュリティを誇張しすぎない
- “best-effort safety checks”であり、完全な監査ではないと明記
```

---

# Prompt 12: Zenn記事作成

```text
VibeSafeを公開するためのZenn記事を書いてください。

タイトル案:
「AIで作ったアプリ、そのまま公開して大丈夫？公開前チェックCLI VibeSafeを作った」

記事構成:
1. なぜ作ったか
2. AI開発で起きがちな事故
3. VibeSafeでできること
4. npx vibesafe check のデモ
5. GitHub ActionでPRチェック
6. Claude Code hookで危険操作を止める
7. 実装で工夫したところ
8. 今後のロードマップ
9. GitHubリンク

読者:
- 個人開発者
- 学生エンジニア
- AIでアプリを作っている人

宣伝っぽくしすぎず、学びのある記事にしてください。
```

---

## 13. 公開前チェックリスト

### 13.1 GitHubリポジトリ

- [ ] README.md がある
- [ ] README.ja.md がある
- [ ] LICENSE がある
- [ ] .gitignore がある
- [ ] examples がある
- [ ] docs がある
- [ ] CIが通る
- [ ] npm publishできる
- [ ] Topicsを設定
  - `ai`
  - `developer-tools`
  - `security`
  - `github-actions`
  - `claude-code`
  - `mcp`
  - `typescript`

### 13.2 README品質

- [ ] 3分で使い方が分かる
- [ ] スクショ or GIF がある
- [ ] 導入コマンドがある
- [ ] 出力例がある
- [ ] Roadmapがある
- [ ] 免責がある

### 13.3 セキュリティ免責

必ず以下のような注意書きを入れる。

```md
VibeSafe provides best-effort safety checks for AI-assisted development.
It is not a replacement for professional security audits, threat modeling, or code review.
Always review findings manually before making security decisions.
```

日本語:

```md
VibeSafeはAI支援開発向けのベストエフォートな安全チェックツールです。
専門的なセキュリティ監査、脅威モデリング、コードレビューの代替ではありません。
検出結果は必ず人間が確認してください。
```

---

## 14. 発信計画

### 14.1 X投稿案

#### 投稿1: 開発開始

```text
AIで作ったアプリをそのまま公開するのが怖いので、公開前チェックCLIを作っています。

`npx vibesafe check` で、
- .env漏洩
- Firebase rulesの公開設定
- Stripe webhook検証漏れ
- CORS *
- GitHub Actionsの危険設定
を検出する予定です。

OSSで公開します。
```

#### 投稿2: デモ

```text
`npx vibesafe check` の最初のデモです。

危険なFirestore rulesと.env.localのコミットを検出できるようになりました。
AIでコードを書く時代だからこそ、公開前の安全チェックを1コマンドにしたい。
```

#### 投稿3: GitHub Action

```text
VibeSafeをGitHub Action対応しました。
PRを出すと、AI生成コードの危険な変更を自動でコメントします。

個人開発・学生開発・AI受託開発の公開前チェックに使えるようにしていきます。
```

#### 投稿4: Claude Code hook

```text
VibeSafeにClaude Code hook対応を入れました。
Claude Codeが `.env.local` を読もうとしたり、`firebase deploy` しようとした時にブロック/警告できます。

AI開発にシートベルトをつける感じです。
```

### 14.2 Zenn記事ネタ

1. AIで作ったアプリにありがちな公開前事故
2. Firebase rulesの危険設定を自動検出するCLIを作った
3. GitHub ActionでAI生成PRを安全チェックする
4. Claude Code hooksで危険操作を止める
5. OSSを就活ポートフォリオにする方法

---

## 15. 将来の有料化案

初期は収益化を狙いすぎず、OSS・発信・就職ポートフォリオを優先します。

将来的な収益化候補:

### 15.1 Hosted Dashboard

- チーム別レポート
- リポジトリ別履歴
- トレンド分析
- Slack通知

価格:

- Indie: $5/month
- Team: $19/month
- Agency: $49/month

### 15.2 Agency report

AI受託会社向けに、顧客提出用Markdown/PDFレポートを生成。

- 納品前診断
- リスク一覧
- 修正済みチェック
- 顧客説明文

### 15.3 GitHub App Pro

- 複数repo管理
- PRコメント更新
- policy template
- audit log

### 15.4 導入支援

- AI開発環境の安全設定
- Firebase/Supabase/Stripe公開前レビュー
- Claude Code/Codex/Gemini CLI運用ルール作成

---

## 16. 採用・就職での見せ方

### 16.1 履歴書・ESでの説明例

```text
AI支援開発者向けの安全チェックOSS「VibeSafe」を開発しました。
TypeScript monorepoでCLI、GitHub Action、Claude Code hookを実装し、AI生成コードにありがちなsecret漏洩、Firebase/Supabase/Stripe/CORS/GitHub Actionsの危険設定を検出できるようにしました。
OSSとして公開し、README、テスト、CI、サンプルプロジェクト、技術記事まで整備しました。
```

### 16.2 面接で話せるポイント

- なぜAI開発に安全チェックが必要だと思ったか
- どのようにルールエンジンを設計したか
- 誤検知をどう扱ったか
- CLI/GitHub Action/Claude hookで共通coreを使う設計
- セキュリティツールとしての免責・安全性
- OSSとして他人が使える形にした工夫
- 今後MCP proxyへ拡張できる設計

---

## 17. 参考仕様・公式ドキュメント

実装時に確認すべき一次情報:

1. GitHub Actions metadata syntax  
   https://docs.github.com/en/actions/reference/workflows-and-actions/metadata-syntax

2. GitHub Actions billing and usage  
   https://docs.github.com/en/actions/concepts/billing-and-usage

3. Claude Code hooks reference  
   https://code.claude.com/docs/en/hooks

4. Claude Code permissions  
   https://code.claude.com/docs/en/permissions

5. Gemini CLI extensions  
   https://google-gemini.github.io/gemini-cli/docs/extensions/

6. Model Context Protocol tools  
   https://modelcontextprotocol.info/docs/concepts/tools/

7. OpenAI Codex agent approvals & security  
   https://developers.openai.com/codex/agent-approvals-security

8. OpenAI Codex sandboxing  
   https://developers.openai.com/codex/concepts/sandboxing

---

## 18. 最初の実装で妥協してよい点

- 完璧な静的解析は不要
- 最初は誤検知があってもよい
- AI修正機能は不要
- Web UIは不要
- チーム機能は不要
- Gemini/MCPはdocsだけでもよい
- Claude hookはBash/Readだけでもよい
- ルールは8個程度でよい

重要なのは、**実際に動くCLIとGitHub Actionを公開すること**です。

---

## 19. 最初のv0.1.0の完成定義

以下を満たせば v0.1.0 として公開してよいです。

- [ ] `npx vibesafe check` が動く
- [ ] `.env.local` を検出できる
- [ ] Firebase public rule を検出できる
- [ ] Supabase RLS disabled を検出できる
- [ ] Stripe webhook署名検証漏れを検出できる
- [ ] CORS wildcard を検出できる
- [ ] GitHub Actions `permissions: write-all` を検出できる
- [ ] Markdownレポートを出せる
- [ ] GitHub Actionとして動く
- [ ] READMEが整っている
- [ ] example projectがある
- [ ] CIが通る

Claude Code hook は v0.1.0 に入れば強いですが、間に合わなければ v0.2.0 でもよいです。

---

## 20. 最終的なロードマップ

```text
v0.1.0  CLI + basic rules + Markdown report
v0.2.0  GitHub Action + PR comments
v0.3.0  Claude Code hook
v0.4.0  Gemini CLI extension
v0.5.0  MCP proxy prototype
v0.6.0  More framework rules: Next.js, Laravel, Flutter/Firebase
v0.7.0  Auto-fix suggestions
v0.8.0  Web dashboard prototype
v1.0.0  Stable rule engine + docs + examples
```

---

## 21. まとめ

VibeSafeは、最初から大きなSaaSとして売るのではなく、以下の順番で育てるのがよいです。

1. **OSSのCLIとして作る**
2. **GitHub Action対応で見栄えを良くする**
3. **Claude Code hookでエージェント管理要素を入れる**
4. **Zenn/X/GitHubで発信する**
5. **就職・インターン・受託・将来の有料化につなげる**

このプロジェクトは、単なるアプリではなく、AI coding agent時代の開発者向けインフラに近いテーマです。個人開発としてすぐに大きな収益になるかは不確実ですが、OSS・就職ポートフォリオ・発信ネタとしてはかなり強いです。

最初の一歩は、以下だけで十分です。

```bash
npx vibesafe check
```

そして、この1コマンドで、AIで作ったコードの危険な公開前ミスを見つけられるようにします。
