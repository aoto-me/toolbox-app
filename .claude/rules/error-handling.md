---
globs: ['components/tools/**', 'app/api/**', 'lib/actions/**']
---

# エラー / ローディング状態

ツールコンポーネントのAPI呼び出しはすべて以下のパターンで統一する:

```ts
const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
```

- ローディング中はボタンを `disabled` にする
- エラーはコンポーネント内にテキストで表示する（`alert()` は使わない）
- `try/catch` でエラーを必ずキャッチする

# エラーメッセージの言語

API Route・Server Actionが返す `error` メッセージ（クライアントにそのまま表示されうるもの）は**日本語で統一する**。英語のリテラル（`'Unauthorized'`, `'Not found'` 等）を混在させない。

- 複数箇所で使い回すメッセージは `lib/error-messages.ts` の共通定数にまとめる（例: `UNAUTHORIZED_MESSAGE`, `NOT_FOUND_MESSAGE`, `INVALID_REQUEST_MESSAGE`, `FORBIDDEN_MESSAGE`）
- 1箇所でしか使わないメッセージは、その場で日本語リテラルを書けばよい（無理に共通化しない）
- 内部の実装詳細（DBのカラム名、S3のキー名など）をメッセージ文言に含めない
- リクエスト形式の不正（`INVALID_REQUEST_MESSAGE`）と、権限・所有権の不正（`FORBIDDEN_MESSAGE`）は意味が異なるので混同しない（エラー監視ツールでの原因切り分けに影響するため）
- ログイン必須のAPI Route・Server Actionは `lib/session.ts` の `getUserId()` を使い、セッションチェックを個別に書き直さない
