---
globs: ['package.json', 'package-lock.json', '.npmrc']
---

# npm依存パッケージの手動更新時の注意

## `.npmrc` の `min-release-age` と npm 11の既知バグ

このリポジトリの `.npmrc` には `min-release-age=20160`（14日、サプライチェーン攻撃対策）が設定されている。

npm 11.21.0ではこの設定を使った状態で **新しいバージョンを選定する処理**（`npm install`・`npm update`・`npm install <pkg>@<version>` など）を実行すると、日付計算が壊れて次のような異常なエラーになる既知バグがある。

```
npm error notarget No matching version found for <pkg>@<version> with a date before 7/31/1971, 9:19:53 AM.
```

### 回避策

`--before "<ISO日時>"` を明示的に指定すると正しく動作する。今日から14日前の日時を計算して渡す。

```bash
npm update --before "2026-09-26T09:20:00Z"
```

一時的に `min-release-age` のチェック自体を無効化したい場合（14日ルールを意図的に無視する例外対応など）は、環境変数で上書きできる。

```bash
npm_config_min_release_age=0 npm install <pkg>@<version>
```

### 発生する/しないタイミング

| 操作                                        | 発生するか | 理由                                                                                                   |
| ------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------ |
| ローカルで `npm install` / `npm update`     | 発生する   | 新しいバージョンを「選定」する処理（ideal tree構築）を通るため                                         |
| CIの `npm ci`（`.github/workflows/ci.yml`） | 発生しない | lockファイルに記録済みの正確なバージョンをそのまま取得するだけで、新しいバージョンの選定処理を通らない |
| Dependabotが自動でPRを作る処理              | 発生しない | GitHub側の独自の依存解決エンジンを使い、このリポジトリの `.npmrc` のnpmコマンドを経由しない            |

つまりこのバグは、**人間やAIエージェントがローカルで手動に `npm update`/`npm install` する時だけ**再発する。CI/CDや自動更新フロー自体には影響しない。npm側のバグなので、npmのバージョンが上がって修正されない限り直らない。

### 既知バグの別バリエーション(2026-10-12 確認)

- `npm outdated` も「新しいバージョンを選定する処理」を通るため同じバグが起きる(`ENOVERSIONS No versions available for <pkg>` のような無関係なパッケージ名でのエラーになることがある)。回避策は `npm update`/`install` と同じ(`npm_config_min_release_age=0 npm outdated` 等)。
- peer dependency 経由で**バージョンを変更しないパッケージ**(例: `next`)の情報を npm が参照する場面でも発火することがある。`@sentry/nextjs` を `npm update @sentry/nextjs --before "<日時>"` で更新しようとすると、`next` 自体はバージョン固定(`"next": "16.4.0"`、キャレット無し)で変更対象ではないにも関わらず、`Found: next@undefined` という ERESOLVE エラーで失敗する。`npm_config_min_release_age=0`(フィルタ自体を無効化)にすると成功する。
  - **ただし `min_release_age=0` で得られた最新バージョンは14日ルールを満たしていない可能性があるため、意図せず隔離期間中のバージョンを採用してしまわないよう、更新後に `npm view <pkg> time --json` で実際の公開日を必ず確認すること**(本件で `@sentry/nextjs@10.76.2` が公開4日後のバージョンを誤って採用しそうになった実例あり)。
