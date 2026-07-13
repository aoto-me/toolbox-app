# permissions.deny の構文制限

`.claude/settings.json` の `permissions.deny` に `Bash(...)` パターンを書くとき、確実に機能するのは次の2つの形だけ。

- 完全一致
- 先頭一致 + 末尾ワイルドカード（例: `Bash(git push --force*)`）

以下のパターンは**機能しない**（実際にBashツールで検証済み）。

- ワイルドカードの後に文字列が続く形（例: `Bash(curl * | bash)` → `curl ... | bash` が実際に通ってしまった）
- 危険なキーワードがコマンドの先頭以外に来る形（例: `Bash(DROP TABLE*)` → `psql -c "DROP TABLE users;"` のような現実的な形は素通りした）
- 引数の順序違いや `sudo` 経由など、先頭一致の前提が崩れる形（例: `Bash(chmod -R 777*)` は `chmod 777 -R` や `sudo chmod -R 777` を拾えない）

先頭一致+末尾ワイルドカード以外のパターンが必要な場合は、`permissions.deny` に頼らず `.claude/hooks/` に `grep -qE` ベースのスクリプトを書き、`PreToolUse`（`matcher: "Bash"`）に登録する。参考実装: `block-remote-script-exec.sh`、`block-drop-sql.sh`、`block-env-secrets.sh`、`block-chmod-777.sh`。

新しい deny ルールや hook を追加したときは、鵜呑みにせず実際にBashツールで（安全な形で）動作確認してから使う。
