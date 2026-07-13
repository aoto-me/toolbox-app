# マイグレーションリセット手順

Drizzle のマイグレーションファイルが増えすぎた場合に、`0000` から作り直す手順。

**この手順は本番のデータを全て削除する。** 必要なデータがあれば事前にバックアップすること。

## 前提

- 全環境（ローカル・テスト・本番）のマイグレーションが最新まで適用済みであること
- 本番 DB のデータを全て削除してよいこと（ユーザー再登録が必要）

## 全体の流れ

```
① ローカルでマイグレーションファイルを作り直す
↓
② ローカル DB・テスト用 DB をリセットして動作確認
↓
③ 本番 RDS を空にする（push より前にやる）
↓
④ git push（GitHub Actions が自動デプロイ）
↓
⑤ コンテナ起動時に migrate.ts が自動実行される
↓
⑥ 本番にユーザーなど初期データを登録する
```

**必ず「③ DB を空にする」→「④ push」の順番で行うこと。**
逆にすると、デプロイ直後のマイグレーションが `relation already exists` で失敗し、コンテナが Exit する。

## ① マイグレーションファイルを作り直す

```bash
# 古いファイルを退避（rm は使わない）
mkdir -p .trash/drizzle-backup
mv drizzle/0*.sql drizzle/meta .trash/drizzle-backup/

# 現在のスキーマから再生成
npx drizzle-kit generate
```

`drizzle/0000_xxx.sql` が 1 ファイルだけ生成される。

## ② ローカル DB・テスト用 DB をリセット

devContainer に `psql` は入っていないので、Node.js スクリプトで実行する。

プロジェクトルートに一時ファイルを作成（`node_modules` の解決のため `tmp/` ではなくプロジェクト内に置く）：

```ts
// _reset-db.ts（実行後に .trash/ へ移動）
import { Pool } from 'pg';

async function resetDb(url: string, label: string) {
  const pool = new Pool({ connectionString: url, ssl: false });
  try {
    await pool.query('DROP SCHEMA IF EXISTS drizzle CASCADE');
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    console.log(`${label}: OK`);
  } finally {
    await pool.end();
  }
}

async function main() {
  await resetDb('postgresql://postgres:postgres@db:5432/appdb', 'ローカルDB');
  await resetDb('postgresql://testuser:testpassword@db-test:5432/toolbox_test', 'テスト用DB');
}

main();
```

```bash
npx tsx _reset-db.ts
mkdir -p .trash && mv _reset-db.ts .trash/
```

削除対象のスキーマ：

- `public` — アプリのテーブル（`users`, `memos`, `files`）
- `drizzle` — マイグレーション履歴テーブル（`__drizzle_migrations`）

両方を削除しないと、マイグレーション適用時にエラーになる。

マイグレーションを適用：

```bash
# ローカル DB
npx tsx db/migrate.ts

# テスト用 DB
DATABASE_URL=postgresql://testuser:testpassword@db-test:5432/toolbox_test npx tsx db/migrate.ts
```

ローカルのシードデータも投入して動作確認：

```bash
# ローカル DB
npx tsx db/seed.ts

# テスト用 DB（E2E テスト用）
npm run test:e2e:seed
```

**注意:** マイグレーション適用は `npx tsx db/migrate.ts` を使う。`drizzle-kit migrate` は使わない（`__drizzle_migrations` への履歴記録が不安定になるため）。

## ③ 本番 RDS を空にする（push する前に！）

EC2 に SSM で接続し、稼働中のコンテナから `DATABASE_URL` を取得して全スキーマを削除する。

```bash
DB_URL=$(docker exec toolbox-app printenv DATABASE_URL)
docker run --rm postgres:16 psql "${DB_URL}?sslmode=require" \
  -c "DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;"
```

テーブルが空になったことを確認：

```bash
docker run --rm postgres:16 psql "${DB_URL}?sslmode=require" -c "\dt"
# → Did not find any relations. と出れば OK
```

## ④ git push してデプロイ

```bash
git add drizzle/
git commit -m "マイグレーションファイルをリセット"
git push
```

GitHub Actions が自動で Docker イメージのビルド → ECR push → EC2 デプロイを実行する。

## ⑤ デプロイ後の確認

`deploy.yml` では、まずマイグレーション用の一時コンテナ（`toolbox-migrate`、`--rm` で自動削除）が `migrate.ts` を実行し、その後アプリコンテナ（`toolbox-app`）が起動する。`toolbox-app` の CMD にも `migrate.ts` が含まれているが、既に適用済みなので 2 回目は何もしない。

EC2 でログを確認：

```bash
docker logs toolbox-app --tail 30
```

テーブルが作成されたかも確認：

```bash
DB_URL=$(docker exec toolbox-app printenv DATABASE_URL)
docker run --rm postgres:16 psql "${DB_URL}?sslmode=require" -c "\dt"
```

## ⑥ 本番にユーザーを登録

EC2 でアプリの Docker イメージを使い、ハッシュ化と INSERT を 1 コマンドで実行する。

```bash
DB_URL=$(docker exec toolbox-app printenv DATABASE_URL)

docker run --rm -e DATABASE_URL="${DB_URL}" -e NODE_ENV=production \
  $(docker images --format '{{.Repository}}:{{.Tag}}' | grep -v '<none>' | head -1) \
  node -e "
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
(async () => {
  const hash = await bcrypt.hash('ここにパスワード', 12);
  await pool.query('INSERT INTO users (email, name, password) VALUES (\$1, \$2, \$3)', ['ここにメールアドレス', 'ここに名前', hash]);
  console.log('登録完了');
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
"
```

`ここにパスワード`・`ここにメールアドレス`・`ここに名前` を実際の値に書き換えて実行する。複数人登録する場合はこのコマンドを繰り返す。

## 動作確認

本番 URL にアクセスし、以下を確認：

- ログインできるか
- 各機能（メモ・ファイルアップロード等）が動くか

## トラブルシューティング

### `relation "xxx" already exists` エラー

③（RDS を空にする）を忘れて push した可能性が高い。

```bash
# コンテナの状態を確認
docker ps -a  # Exited(1) になっているはず

# ③の手順で DB を空にしてから再起動
DB_URL=$(docker exec toolbox-app printenv DATABASE_URL)
docker run --rm postgres:16 psql "${DB_URL}?sslmode=require" \
  -c "DROP SCHEMA public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public;"

docker restart toolbox-app
sleep 5
docker logs toolbox-app --tail 20  # Migration complete が出るか確認
```

### コンテナが Exited(1) のまま動かない

DB を空にしてから `docker restart toolbox-app` で再起動すれば、CMD が最初から実行され直してマイグレーションが成功する。
