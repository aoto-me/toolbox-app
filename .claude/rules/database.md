---
globs: ['db/**', 'drizzle.config.*']
---

# データベースマイグレーション

マイグレーションコマンドは **`npx tsx db/migrate.ts` のみ使う**。`drizzle-kit migrate` は使わない。

| やること                         | コマンド                   |
| -------------------------------- | -------------------------- |
| マイグレーション適用（ローカル） | `npx tsx db/migrate.ts`    |
| マイグレーションファイル生成     | `npx drizzle-kit generate` |

`drizzle-kit migrate` を使うと `__drizzle_migrations` テーブルへの履歴記録が不安定になり、適用済み状態が混乱する。`db/migrate.ts` は `drizzle-orm/node-postgres/migrator` を使って確実に履歴を管理する。
