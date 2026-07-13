# セキュリティ設計

## 1. 認証方式

- next-auth v5（Credentials プロバイダー）を使用
- セッション管理方式: JWT
- セッション有効期限: 30日
- ログインページ: `/login`
- JWTトークンにユーザーIDを格納し、`session.user.id` として参照する
- 未認証状態でのアクセスはミドルウェアが `/login` にリダイレクト

## 2. パスワード管理

- bcryptjs でハッシュ化して `users.password` に保存
- ログイン時は `bcrypt.compare()` でハッシュと照合
- 入力バリデーション: メールアドレス最大254文字、パスワード最大128文字

## 3. レート制限（ブルートフォース対策）

- ログイン失敗をサーバーのメモリ（`Map`）で管理
- IPアドレスとメールアドレスの両方を独立してカウント
- 10回失敗で30分ロック
- ロック解除後は自動でカウントリセット
- ログイン成功時はIPとメール両方のカウントをリセット
- IP取得優先順位: `x-forwarded-for` → `x-real-ip` → `'unknown'`
- 注意: コンテナ再起動でカウントはリセットされる（個人用途のため許容）

## 4. セキュリティヘッダー

本番環境のみ適用（開発環境では無効）。

| ヘッダー                  | 値                                             |
| ------------------------- | ---------------------------------------------- |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` |
| X-Content-Type-Options    | `nosniff`                                      |
| Referrer-Policy           | `strict-origin-when-cross-origin`              |
| Permissions-Policy        | `camera=(self), microphone=(), geolocation=()` |
| X-Robots-Tag              | `noindex, nofollow`                            |
| X-DNS-Prefetch-Control    | `on`                                           |

### Content Security Policy

| ディレクティブ            | 値                                                             |
| ------------------------- | -------------------------------------------------------------- |
| default-src               | `'self'`                                                       |
| script-src                | `'self' 'unsafe-inline'`                                       |
| style-src                 | `'self' 'unsafe-inline'`                                       |
| img-src                   | `'self' blob: data:`                                           |
| font-src                  | `'self'`                                                       |
| connect-src               | `'self' https://*.amazonaws.com https://*.ingest.us.sentry.io` |
| object-src                | `'none'`                                                       |
| base-uri                  | `'self'`                                                       |
| form-action               | `'self'`                                                       |
| frame-ancestors           | `'none'`                                                       |
| upgrade-insecure-requests | -                                                              |

## 5. ファイルアクセス制御

- S3ファイルは直接公開しない。署名付きURL（presigned URL）経由のみアクセス可
- アップロードフロー: クライアント → `/api/files/presign` で署名付きURLを取得 → S3に直接アップロード
- 署名付きURL発行前にセッション認証チェックを実施

## 6. エラー監視

- Sentry（@sentry/nextjs）でエラーをトラッキング
- 本番環境のみ有効
- ソースマップは無効（プライバシー考慮）
- Sentryのテレメトリは無効

## 7. サプライチェーン攻撃対策

`.npmrc` に `min-release-age=20160`（14日 = 20160分）を設定している。

npm に公開されてから14日未満のパッケージバージョンはインストールできないようにすることで、悪意あるパッケージが公開された直後に Dependabot 等で自動インストールされるリスクを軽減する。
