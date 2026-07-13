# ユーザープロフィール

@.claude/user-profile.md

# プロジェクト概要

個人用ツール集ダッシュボード。税計算・メモ・ファイルアップロード・ブラウザ互換性検索等のツールを1ページに並べたWebアプリ。ログイン機能あり、PWA対応（スマホのホーム画面インストール）。

# アーキテクチャ

## ページ構成

- `app/login/page.tsx` — ログインページ（Server Component）
- `app/(dashboard)/page.tsx` — ダッシュボード（Server Component）
- ツール機能はすべて `components/tools/` 配下の独立したコンポーネント

## ディレクトリ構成

```
auth.ts                          ← NextAuth v5 設定本体（handlers・auth・signIn・signOut をエクスポート）
proxy.ts                         ← Next.js middleware（セッション有無でログイン/ダッシュボードをリダイレクト）
instrumentation.ts               ← Sentry サーバーサイド init
instrumentation-client.ts        ← Sentry クライアントサイド init
app/
  (dashboard)/
    layout.tsx                   ← ダッシュボードレイアウト（SessionGuard・Toast・PullToRefresh を束ねる）
    page.tsx
    page.module.scss
  login/
    page.tsx
    page.module.scss
  api/
    auth/[...nextauth]/route.ts  ← auth.ts の handlers をリレーするだけ
    files/
      presign/route.ts           ← S3署名付きURL生成
      [id]/route.ts              ← S3削除
      [id]/download/route.ts     ← S3ダウンロードURL生成
  layout.tsx
  manifest.ts                    ← PWA manifest
  global-error.tsx               ← グローバルエラーページ（Sentry統合）
  not-found.tsx                  ← 404ページ
  robots.ts                      ← robots.txt
components/
  tools/
    PriceCalculator/
    Memo/
    FileUpload/
    BrowserCompat/
  layout/
    DashboardGrid/               ← ツールカードのグリッドレイアウト
    DashboardDataProvider/       ← 初期データを Context 経由で提供
    PullToRefresh/               ← プルトゥリフレッシュ
    SealingWax/                  ← ログアウトボタン
    SessionGuard/                ← セッション監視・認証ガード
    Toast/                       ← トースト通知
lib/
  actions/             ← Server Actions（'use server'）
    memo.ts            ← saveMemo()
    file.ts            ← registerFile()
    compat.ts          ← searchCompat() / getCompatDetail()
  *.ts                 ← 純粋関数・ユーティリティ（テスト対象）
```

## Server Action / API Route の使い分け

| 手段                            | 使う場面                               |
| ------------------------------- | -------------------------------------- |
| Server Action（`lib/actions/`） | DBミューテーション・純粋なサーバー処理 |
| API Route（`app/api/`）         | S3など外部サービスのURL生成・NextAuth  |

Server Action はクライアントコンポーネントから直接呼び出せる `'use server'` 関数。API Route は S3 署名付き URL のように「外部サービスの URL をブラウザに返す」用途に使う。

# devContainer 環境の制約

`~/.claude/` ディレクトリは devContainer リビルドで消失する。Claude Code の設定やスクリプトは `~/.claude/` に追加せず、プロジェクト内の `.claude/` 配下に配置すること。

- 個人設定 → `.claude/settings.local.json`（`.gitignore` 済み）
- フック → `.claude/hooks/`
- ステータスラインスクリプト → `.claude/statusline-command.sh`（`.gitignore` 済み）

# 注意点

## PostToolUse フックと Edit の順序

PostToolUse フックで ESLint `--fix` が走るため、import の追加と使用箇所の変更を別々の Edit で行うと、1回目の Edit 後に ESLint が未使用 import を削除してしまう。import の追加と使用箇所の変更は1つの Edit にまとめること。

# Git 運用

- **作業（ファイルの編集・作成）は必ずブランチを切ってから行う。** push 前だからといって main 上で Edit/Write を実行しない（コミット前の段階でも禁止）
- ブランチを切る前に `git fetch origin` してから `git status` 等で **ローカルの main がリモートの main と一致していること** を確認する。ズレている場合は `git pull origin main` してから分岐する
- main への直接 push 禁止。必ずブランチを切って PR 経由でマージする
- ブランチ名: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/` + 英語 kebab-case（例: `feat/add-memo-tag`）
- コミットメッセージ: 日本語（例: `メモ機能にタグ追加`）
- PR タイトル・本文: 日本語
- マージ方法: Squash merge
- PR作成前に必ず `/code-review` を実行し、指摘があれば対応してから `gh pr create` に進む
- PR 作成は `gh pr create` で行う。**実行前に必ずユーザーに確認を取ること**
- PR 作成後は PR URL をユーザーに報告する
- `ScheduleWakeup`（2分間隔）で GitHub Actions の完了を監視する（`gh pr view <番号> --json statusCheckRollup` で全チェックを確認）
- 全チェックが SUCCESS になったら `gh pr merge <番号> --squash` を実行する
- 即座に `git checkout main && git pull origin main` でローカルを更新し、`git branch -d <ブランチ名>` でローカルブランチを削除する
- マージ後のリモートブランチは自動削除（GitHub の設定）

## WebFetch ホワイトリスト管理

未登録ドメインへの WebFetch が必要になった場合、フックが自動で確認プロンプトを出す。許可を得たら `.claude/hooks/confirm-webfetch.sh` の `TRUSTED_DOMAINS` に追加してからアクセスする。

# セッション知見の記録

以下のタイミングで、セッション中に得た知見を振り返り、記録すべきものがあればユーザーに提案すること：

- 大きな作業が完了したとき
- ユーザーがセッション終了を示唆したとき
- `/compact` の前

今後のために記録すべき知見があれば、内容と保存先をユーザーに提案すること。保存先はその都度相談して決める。devContainer リビルドで消える `~/.claude/` 配下には保存しない。
