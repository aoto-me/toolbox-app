# インフラ・デプロイ設計

## 1. デプロイフロー

### 全体図

```
[main ブランチへの push]
    │
    ▼
[GitHub Actions]
    │ デプロイ用IAMユーザーで AWS 認証
    │
    ├─① Docker イメージをビルド
    │   └─ NEXT_PUBLIC_SENTRY_DSN をビルド引数として注入
    │
    ├─② Amazon ECR にプッシュ（タグ: latest 固定）
    │
    └─③ AWS SSM send-command で EC2 に1個のコマンド列として送信
            │
            ▼
        [AWS EC2]
            1. ECR へ docker login
            2. docker system prune -f（未使用イメージ・コンテナ削除）
            3. 新イメージを docker pull
            4. 旧 <アプリコンテナ> を停止・削除
            5. <マイグレーションコンテナ>（--rm の一時コンテナ）で
               npx tsx db/migrate.ts を実行 → 完了後は自動削除
            6. <アプリコンテナ> を新規起動（ポート3000、各種環境変数を注入）
```

### ステップ詳細

| No  | ステップ           | 実行主体       | 内容                                                                                 |
| --- | ------------------ | -------------- | ------------------------------------------------------------------------------------ |
| -   | AWS 認証           | GitHub Actions | `aws-actions/configure-aws-credentials` でアクセスキー認証                           |
| -   | ECR ログイン       | GitHub Actions | `aws-actions/amazon-ecr-login`                                                       |
| ①   | イメージビルド     | GitHub Actions | `docker build`（`NEXT_PUBLIC_SENTRY_DSN` をビルド引数で注入）                        |
| ②   | ECR プッシュ       | GitHub Actions | `docker push`（`:latest` タグ）                                                      |
| ③   | SSM 送信           | GitHub Actions | `aws ssm send-command` で EC2 にシェルコマンドを送信                                 |
| 1   | ECR ログイン       | EC2            | `aws ecr get-login-password` でトークン取得 → docker login                           |
| 2   | 未使用リソース削除 | EC2            | `docker system prune -f`                                                             |
| 3   | イメージ更新       | EC2            | `docker pull` で最新イメージを取得                                                   |
| 4   | 旧コンテナ削除     | EC2            | `docker stop` / `docker rm` で旧アプリコンテナを削除                                 |
| 5   | マイグレーション   | EC2            | `--rm` 付き一時コンテナ（マイグレーションコンテナ）で `npx tsx db/migrate.ts` を実行 |
| 6   | コンテナ起動       | EC2            | `docker run -d` で新しいアプリコンテナをバックグラウンド起動（ポート 3000）          |

### トリガー

- `main` ブランチへの push 時のみ実行
- PR マージ後に自動デプロイされる

## 2. IAM 設計

### 概要

| アイデンティティ           | 種別         | 用途                               |
| -------------------------- | ------------ | ---------------------------------- |
| デプロイ用 IAM ユーザー    | IAM ユーザー | GitHub Actions からのデプロイ操作  |
| S3 アクセス用 IAM ユーザー | IAM ユーザー | アプリケーションからの S3 アクセス |
| EC2 インスタンスロール     | IAM ロール   | EC2 インスタンスプロファイル       |

### デプロイ用 IAM ユーザー

GitHub Actions ワークフローが AWS を操作するために使うユーザー。アクセスキーを GitHub Secrets に登録して使用。

| ポリシー名                            | 用途                                         |
| ------------------------------------- | -------------------------------------------- |
| `AmazonEC2ContainerRegistryPowerUser` | ECR へのイメージプッシュ                     |
| `AmazonSSMFullAccess`                 | SSM send-command による EC2 へのコマンド送信 |

### S3 アクセス用 IAM ユーザー

アプリケーション（Next.js）が S3 を操作するために使うユーザー。アクセスキーを環境変数として EC2 コンテナに渡す。

| ポリシー名                  | 用途                                          |
| --------------------------- | --------------------------------------------- |
| S3 アクセスカスタムポリシー | S3 の読み取り・書き込み（特定バケットに限定） |

### EC2 インスタンスロール

EC2 インスタンスに付与するロール（インスタンスプロファイル）。SSM エージェントの動作と ECR からのイメージ取得に必要。

| ポリシー名                           | 用途                                              |
| ------------------------------------ | ------------------------------------------------- |
| `AmazonSSMManagedInstanceCore`       | SSM エージェントの動作（send-command の受け取り） |
| `AmazonEC2ContainerRegistryReadOnly` | ECR からの docker pull                            |

## 3. ECR 設定

| 項目             | 内容                                                         |
| ---------------- | ------------------------------------------------------------ |
| リージョン       | `ap-northeast-1`（東京）                                     |
| リポジトリ名     | GitHub Secret `ECR_REPOSITORY` で管理                        |
| イメージタグ戦略 | `:latest` 固定（世代管理なし）                               |
| 認証             | `aws ecr get-login-password` でトークンを取得し docker login |

## 4. Dockerfile

| 項目           | 内容                                                                       |
| -------------- | -------------------------------------------------------------------------- |
| ベースイメージ | `node:22-bookworm-slim`                                                    |
| ビルド引数     | `NEXT_PUBLIC_SENTRY_DSN`（ビルド時に環境変数として注入）                   |
| ポート         | `3000`                                                                     |
| 起動コマンド   | `npx tsx db/migrate.ts && npm start`（起動時にマイグレーションを自動実行） |

ビルド手順：

1. `npm ci` で依存パッケージインストール
2. `npm run build` で Next.js ビルド
3. コンテナ起動時にマイグレーション → `npm start`

> **補足**: デプロイ時にマイグレーション用一時コンテナでもマイグレーションが実行されるため、アプリコンテナ側の実行は実質2回目（何もせず終わる）。将来的には起動コマンドを `npm start` のみに整理してよい。

## 5. GitHub Secrets 一覧

GitHub Actions ワークフローが参照する Secrets の一覧。

### AWS 認証（デプロイ用 IAM ユーザー）

| Secret 名               | 用途                                              |
| ----------------------- | ------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`     | デプロイ用 IAM ユーザーのアクセスキー ID          |
| `AWS_SECRET_ACCESS_KEY` | デプロイ用 IAM ユーザーのシークレットアクセスキー |

### ECR

| Secret 名        | 用途                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| `ECR_REGISTRY`   | ECR レジストリ URL（例: `123456789.dkr.ecr.ap-northeast-1.amazonaws.com`） |
| `ECR_REPOSITORY` | ECR リポジトリ名                                                           |

### EC2

| Secret 名         | 用途                                     |
| ----------------- | ---------------------------------------- |
| `EC2_INSTANCE_ID` | SSM send-command の送信先インスタンス ID |

### アプリケーション（コンテナ起動時の環境変数）

| Secret 名                  | 用途                                                 |
| -------------------------- | ---------------------------------------------------- |
| `DATABASE_URL`             | 本番 DB（RDS）の接続 URL                             |
| `AUTH_SECRET`              | next-auth の署名用シークレット                       |
| `AUTH_URL`                 | 本番アプリの URL（next-auth が使用）                 |
| `AWS_S3_ACCESS_KEY_ID`     | S3 アクセス用 IAM ユーザーのアクセスキー ID          |
| `AWS_S3_SECRET_ACCESS_KEY` | S3 アクセス用 IAM ユーザーのシークレットアクセスキー |
| `AWS_REGION`               | S3 バケットのリージョン                              |
| `S3_BUCKET_NAME`           | ファイルアップロード先の S3 バケット名               |

### ビルド引数

| Secret 名                | 用途                                                   |
| ------------------------ | ------------------------------------------------------ |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry の DSN（docker build 時にビルド引数として注入） |

## 6. ローカル開発用環境変数（.env.local）

DevContainer でローカル開発する際に `.env.local` に設定する変数の一覧。

| 変数名                     | ローカルでの値                                 | 備考                                               |
| -------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| `AUTH_SECRET`              | 任意の文字列                                   | next-auth の署名用シークレット                     |
| `AUTH_URL`                 | `http://localhost:3000`                        | 固定                                               |
| `DATABASE_URL`             | `postgresql://postgres:postgres@db:5432/appdb` | Docker Compose の DB コンテナに固定                |
| `AWS_S3_ACCESS_KEY_ID`     | S3 アクセス用 IAM ユーザーのアクセスキー       | 本番 S3 と共用                                     |
| `AWS_S3_SECRET_ACCESS_KEY` | S3 アクセス用 IAM ユーザーのシークレットキー   | 本番 S3 と共用                                     |
| `AWS_REGION`               | `ap-northeast-1`                               | 固定                                               |
| `S3_BUCKET_NAME`           | 本番バケット名                                 | 本番 S3 と共用                                     |
| `ALLOWED_DEV_ORIGINS`      | 端末のローカル IP（例: `192.168.1.5`）         | スマホ等からの開発用アクセスを許可。不要なら省略可 |

### 補足

- `NEXT_PUBLIC_SENTRY_DSN` はローカルでは不要（設定しなければ Sentry は無効）
- S3 はローカル専用バケットを用意せず本番バケットを共用している

## 7. Nginx・HTTPS

EC2 上に Nginx をインストールし、以下の役割を担わせている。

- **リバースプロキシ**: 外部からのリクエストを EC2 上の Next.js コンテナ（ポート 3000）に転送
- **HTTPS 終端**: SSL/TLS の処理を Nginx で行い、コンテナには HTTP で転送
- **HTTP → HTTPS リダイレクト**: ポート 80 へのアクセスをポート 443 にリダイレクト

SSL 証明書は **Let's Encrypt（Certbot）** で取得・管理している。<br/>
証明書の取得時には、実際に使用する本番ドメインを Certbot に指定する。

証明書の自動更新は `/etc/crontab` に設定された cron で毎日午前3時に `certbot renew --quiet` が実行される。

### クライアント IP の転送

レート制限でクライアントの実 IP を取得するため、Nginx のリバースプロキシ設定に以下を含める必要がある。

```nginx
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Real-IP       $remote_addr;
```

これを設定しないと、アプリ側では Nginx 自身の IP（`127.0.0.1`）しか取得できず、レート制限が全ユーザー共通になってしまう。<br/>
アプリは `x-forwarded-for` → `x-real-ip` の順で IP を読む（[セキュリティ設計 §3](./security-design.md) 参照）。

## 8. EC2 への管理アクセス

AWS マネジメントコンソールの **SSM セッションマネージャー** 経由で EC2 にアクセスしてコマンドを実行する。SSH キーペアは使用していない。

## 9. ログ管理

Sentry によるエラー通知のみ行っている。<br/>
それ以外のログ（アクセスログ・アプリログ等）は収集・保存していない。<br/>
アプリのログは必要に応じて `docker logs` で確認する。

## 10. EC2 OSアップデート

OS の自動アップデートは設定していない。<br/>
定期的に SSM セッションマネージャー経由で手動実行する。

**実施手順:**

1. AWS マネジメントコンソールで EC2 インスタンスの **スナップショットを取得** してから作業を開始する
2. SSM セッションマネージャーで EC2 に接続する
3. OS アップデートを実行する

```bash
sudo apt update && sudo apt upgrade -y
```

4. 必要に応じて EC2 を再起動する

> スナップショットは更新前の状態に戻せる唯一の手段。必ず更新前に取得すること。

## 11. データバックアップ方針

### RDS

AWS のデフォルト設定により、自動バックアップが有効になっている（保持期間1日）。

- 毎日1回、スナップショット（フルバックアップ）とトランザクションログが自動取得される
- 過去1日以内の任意の時点に Point-in-Time Recovery（PITR）で復元できる
- 1日を過ぎたスナップショットは自動削除される
- 意図的に運用しているわけではなく、AWS のデフォルト動作としてそのまま有効にしている

### S3

バックアップなし。

### 方針

このアプリが扱うのは「一時的なメモ」「一時的なファイル共有」であり、データが失われても問題ない用途のみを意図している。<br/>
そのため、バックアップの積極的な運用はしない。
