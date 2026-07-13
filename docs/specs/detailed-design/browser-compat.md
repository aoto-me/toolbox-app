# 詳細設計: ブラウザ互換性検索

## 1. UI要件・操作フロー

### 画面構成

- 検索入力フィールド（プレースホルダー: `例: grid-template-columns, Promise.all`）
- クリアボタン（入力ありの時のみ表示）
- サジェストドロップダウン（候補がある時のみ表示）
- ステータスメッセージ（読み込み中 / エラー）
- 検索結果テーブル（選択後に表示）

### 検索・サジェストフロー

1. 2文字以上入力すると 300ms デバウンスで候補を取得
2. サジェストドロップダウンに最大30件を表示
3. 候補をクリック（またはキーボード操作）で選択
4. 詳細データを取得して結果テーブルを表示

### キーボード操作

| キー                      | 動作                          |
| ------------------------- | ----------------------------- |
| ↓ / Tab（入力フィールド） | サジェストの1番目にフォーカス |
| ↑ / ↓（サジェスト内）     | サジェスト項目間を移動        |
| ↑（サジェスト1番目）      | 入力フィールドに戻る          |
| Enter（サジェスト）       | 選択して詳細を取得            |
| Escape                    | ドロップダウンを閉じる        |

### ドロップダウンの仕様

- `createPortal` で `document.body` に描画（ダッシュボードのスクロールコンテナの影響を受けないため）
- スクロール・リサイズ時も入力フィールドの位置に追従
- 表示最大高さ: ウィンドウ内の利用可能高さに応じて 80px〜260px で調整
- 入力フィールド外のクリックでドロップダウンを閉じる

### サジェスト一覧の表示内容

- キー（例: `css.properties.grid-template-columns`）
- カテゴリラベル（例: `CSS`）

### ステータス表示

| 状態               | 表示                           |
| ------------------ | ------------------------------ |
| `loading`          | "読み込み中..."                |
| `error`            | "データを取得できませんでした" |
| `idle`（結果あり） | 検索結果テーブル               |

## 2. 外部データソース

### データソース

- `@mdn/browser-compat-data` npm パッケージを使用
- MDN Browser Compatibility Data（BCD）と呼ばれる、MDN が管理するブラウザ互換性データセット
- 外部 API への HTTP リクエストは発生しない

### データの取得方法

- npm パッケージとしてアプリにバンドルされており、サーバー起動時にメモリに読み込まれる
- 全キー一覧（`ALL_KEYS`）はサーバー起動時に一度だけ収集してメモリにキャッシュされる
- サジェスト・詳細取得はいずれもメモリ上のデータを参照するため、DB アクセスも外部通信も不要

### データの鮮度

- パッケージのバージョンアップによってのみ最新データに更新される
- リアルタイムの最新ブラウザ対応状況は反映されない

### カテゴリ一覧

BCD データの最上位キーをカテゴリとして扱い、以下のラベルで表示する：

| キー          | 表示ラベル |
| ------------- | ---------- |
| api           | API        |
| css           | CSS        |
| html          | HTML       |
| http          | HTTP       |
| javascript    | JS         |
| manifests     | Manifest   |
| mathml        | MathML     |
| mediatypes    | Media      |
| svg           | SVG        |
| webassembly   | WASM       |
| webdriver     | WebDriver  |
| webextensions | Extension  |

## 3. Server Action仕様

認証不要。すべてのデータはメモリ上の BCD データから返す（DB・外部通信なし）。実装は `lib/actions/compat.ts`。

### `searchCompat(query: string)` — サジェスト取得

**引数**: 検索クエリ文字列（2文字以上で呼び出す）

**戻り値**:

```ts
{
  suggestions: {
    key: string;
    category: string;
  }
  [];
}
```

- クエリに部分一致するキーを最大 **30件** 返す（大文字小文字を区別しない）

**例**:

```json
{
  "suggestions": [
    { "key": "css.properties.grid-template-columns", "category": "CSS" },
    { "key": "javascript.builtins.Promise.all", "category": "JS" }
  ]
}
```

### `getCompatDetail(key: string)` — 詳細取得

**引数**: BCD キー文字列（例: `css.properties.display`）

**戻り値**:

```ts
{
  key: string;
  mdnUrl: string | null;
  browsers: {
    id: string;
    name: string;
    supported: boolean | null;
    text: string;
    iphoneLabel: string | null;
  }
  [];
}
```

`browsers` の各フィールド：

| フィールド    | 型              | 説明                                          |
| ------------- | --------------- | --------------------------------------------- |
| `id`          | string          | ブラウザ識別子                                |
| `name`        | string          | 表示名                                        |
| `supported`   | boolean \| null | `true`: 対応 / `false`: 未対応 / `null`: 不明 |
| `text`        | string          | 対応開始時期またはステータスのテキスト        |
| `iphoneLabel` | string \| null  | iOS Safari のみ対応 iPhone モデル名を補足     |

**エラー（throwされる）**:

| 条件               | メッセージ             |
| ------------------ | ---------------------- |
| `key` が存在しない | `見つかりませんでした` |

## 4. 表示するブラウザ一覧と表示形式

### 表示ブラウザ一覧

| ID               | 表示名         |
| ---------------- | -------------- |
| `chrome`         | Chrome         |
| `safari`         | Safari         |
| `firefox`        | Firefox        |
| `safari_ios`     | iOS Safari     |
| `chrome_android` | Chrome Android |

### 対応状況の表示形式

| 状態                   | 表示                      |
| ---------------------- | ------------------------- |
| 対応（リリース日あり） | `2017年10月〜（約7年前）` |
| 対応（リリース日なし） | `v60〜`                   |
| 未対応                 | × アイコン                |
| 不明                   | `不明`                    |

### iOS Safari の iPhone 対応ラベル

iOS Safari のバージョンに対応する iPhone モデル名を補足表示する（例: "iPhone 6s以降"）。

表示例：

```
iOS Safari  |  2017年9月〜（約7年前）  iPhone 6s以降
```

### バージョン情報の解決ロジック

1. BCD の `support` フィールドが配列の場合、先頭要素のみを使用
2. `version_added` が `false` → 未対応
3. バージョン番号からリリース日を引き、現在との差分を年数で表示
4. マイナーバージョン（`14.0` 等）はメジャーバージョン（`14`）にフォールバック
5. リリース日が存在しない場合はバージョン番号のみ表示（`v60〜`）
