---
globs:
  [
    '*.test.ts',
    '*.test.tsx',
    '*.spec.ts',
    '*.spec.tsx',
    'vitest.config.*',
    'playwright.config.*',
    'e2e/**',
  ]
---

# テスト

## 基本方針

- Vitest でユニットテストを書く
- テスト対象は純粋関数、および外部依存のない状態管理ロジック
- テストを書くためにロジックの切り出しが必要なら、リファクタリングしてよい

## ファイル配置

- テスト対象のロジックは `lib/` に切り出し、テストも `lib/` に置く（例: `lib/auth.test.ts`）
- `lib/` のファイル名は kebab-case で統一する
- E2E テストを追加する場合は `e2e/` ディレクトリに配置する

## テストの書き方

- `describe` でテスト対象の関数名をグループ化する
- `it` の説明は日本語で、関数の振る舞いを書く（例: `emailが空なら null を返す`）
- 時刻依存のロジックは `now` 引数を受け取れるようにして、テストで固定値を渡す

## 実行

- `npm test` で全ユニットテスト実行（`vitest run`）
- CI（`.github/workflows/ci.yml`）で PR ごとに lint → test → build → e2e を実行する

## E2Eテスト（Playwright）

### 実行方法

```bash
# devContainer リビルド後は初回のみ以下を実行
npx playwright install chromium
DATABASE_URL=postgresql://testuser:testpassword@db-test:5432/toolbox_test npx tsx db/migrate.ts

# シードデータ投入（テスト用DBにテストユーザーを作成）
npm run test:e2e:seed

# E2Eテスト実行
npm run test:e2e
```

### 設計上の注意

- E2Eテストは `next build && next start` でポート3001に専用サーバーを起動する（`next dev` は同一ディレクトリで複数起動できないため）
- テスト用DBは `db-test:5432/toolbox_test`。開発用DB（`db:5432`）とは分離されている
- `db/index.ts` の SSL 制御: `DATABASE_SSL=false` でSSLを無効化できる（テスト用DBはSSL非対応のため）
- マイグレーション適用時は `DATABASE_URL` を直接テスト用DBに向ける（`migrate.ts` は `E2E_DATABASE_URL` を見ない）
