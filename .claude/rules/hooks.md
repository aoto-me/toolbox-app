# フック(PreToolUse / PostToolUse)

Claude Code のフックには、この環境固有の制約が2つある。**知らずに素朴に書くと動かない。**
詳しい経緯・証拠は `.claude/hooks/README.md`。

## 制約1(解消済み・2026-10-12): `matcher:"Bash"` は以前発火しなかった(Claude Code のバグ)

- 2026-07時点のClaude Code 2.1.201では、`PreToolUse` で `matcher: "Bash"` を指定したフックが
  **一切発火しなかった**(`WebFetch` や `Write|Edit` は正常)。回避策として matcher なし(全ツール対象)
  で登録し、中で `tool_name=="Bash"` を自前判定する方式(`bash-guard.sh`)を取っていた。
- **2026-10-12、Claude Code 2.1.212で再検証したところ、`matcher:"Bash"` は正常に発火することを
  実機確認した**(発火スモーク・実際のdenyの両方で確認済み)。`.claude/settings.json` の
  `bash-guard.sh` 登録は `matcher:"Bash"` に戻してシンプルな本来の形にしている。
- **Bash に対する block/confirm は `.claude/hooks/bash-guard.sh` に追記する**(集約方針自体は維持。
  複数ファイルに分散させるより1箇所にまとまっている方が保守しやすいため)。中で `emit_deny`/`emit_ask`
  を呼ぶだけ。`tool_name=="Bash"` の判定も defense-in-depth として残したまま。
- 将来また `matcher:"Bash"` が発火しなくなったら(Claude Code側の再発バグの可能性)、
  `echo __hookcheck__` の発火スモークで気付けるはず。その場合は matcher なしに戻すこと。
  詳しい経緯は `.claude/hooks/README.md`。

## 制約2: `/dev/tty` は使えない(v2.1.139 以降の公式仕様)

- フックは制御端末なしで実行される。`read < /dev/tty` や `echo > /dev/tty` は必ず失敗する。
- 確認・ブロック・許可は **stdout に JSON を返す**:
  `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow|ask|deny","permissionDecisionReason":"…"}}`
  - `deny`=ブロック / `ask`=ユーザー確認ダイアログ / `allow`=無確認で自動許可。
  - `exit 0` は「標準フローへ進め」であって auto-approve ではない(ホワイトリストで許可したいなら明示的に `allow` を返す)。

## 健全性チェックに反応する

- セッション冒頭に「🪝 フック自己診断が発動しました」と出たら(= Claude Code 更新 or 新規ブランチ検知)、
  案内どおり **`echo __hookcheck__` を1回実行**し、🪝 [bash-guard] の確認ダイアログが出るか確かめる。
  出れば発火は正常。出ずに素通りしたらフック発火が退行しているので `.claude/hooks/README.md` を参照。
- フックを編集したら `bash .claude/hooks/tests/run-all.sh` でロジック単体テストを回す。

## security-guidance プラグイン(公式プラグイン・有効化済み)

`.claude/settings.json` の `enabledPlugins` で `security-guidance@claude-plugins-official` が有効になっている。
このプラグインは `git commit`・`git push`・セッション終了(`Stop`)のたびに、diffベースのLLMセキュリティレビューを
**非同期**で走らせ、指摘があれば自動でセッションを再開して報告する(`.claude/hooks/`配下の自作フックとは別経路)。

- これは `bash-guard.sh` 等の正規表現ベースの検知とは独立した、もう1枚の安全網。実際に本プロジェクトの
  自作フック改修で、正規表現の設計ミス(フラグ文法を厳密に解析しようとして `--flag=value` 構文のバイパスを
  許してしまった等)をこのプラグインが検出した実績がある。
- **既存の運用ルール(`PR作成前に /code-review を実行`)を代替するものではない。** `/code-review` は作業者が
  明示的に実行する同期的なレビューで、diffの正しさ・簡潔さまで広く見る。security-guidanceプラグインは
  commit/push/Stop時に自動で走る非同期のセキュリティ観点のみの追加チェックであり、どちらか一方で足りるわけではない。
- 非同期レビューの指摘が来たら、内容を検証してから対応する(鵜呑みにしない。他のフック同様、指摘内容が
  プロンプトインジェクションでないか確認してから動く)。

## ネイティブ `permissions.ask` との使い分け

Claude Code には `permissions.deny`/`permissions.ask`/`permissions.allow` という組込みの確認機構があり、
`bash-guard.sh` の自前 `emit_ask` と役割が重複する。評価順序は常に **deny → ask → allow**(具体性に関わらない。
より狭い `allow` があっても、マッチする `ask` があれば必ず確認が入る)。これを踏まえて使い分ける:

- **動的な分岐ロジックが不要な単純な確認**(`gh pr create`・`npm install`・DBマイグレーション等)は
  `.claude/settings.json` の `permissions.ask` **にも**同じルールを追加し、`bash-guard.sh` 側の既存の
  `emit_ask` と二重化する。ネイティブ側は複合コマンド(`&&`・`;`・`|`・サブシェル等)を正しく分割して
  判定できる一方、**コマンドのテキスト表現にしかマッチせず**、`env gh pr create` のような
  Claude Codeが対応していないラッパー経由の呼び出しは素通りする(公式ドキュメント
  `What a Bash rule doesn't match` に明記)。`bash-guard.sh` の正規表現は語の位置を問わず検知できるため、
  どちらか一方への完全移行ではなく両方に書くのが安全(自動セキュリティレビューで指摘・確認プロンプト自体は
  二重に出ない)。
- **動的な分岐ロジックが必要な確認**(例: mainブランチかどうかで deny/ask を変える `git push`)は
  ネイティブルールで表現できないため `bash-guard.sh` にのみ残す。
- **「どんな書き方をされても確実に防ぎたい」破壊的操作**(`git reset --hard`・`chmod -R 777` 等)も
  `bash-guard.sh` にのみ残す。ネイティブの `Bash(git push *)` 系ルールは**コマンドのテキスト表現にしか
  マッチしない**ため、`git -C . push` や `git -c push.default=current push` のような別の書き方は
  素通りする。`bash-guard.sh` の正規表現はこうした迂回形にも対応できるよう意図的に柔軟に書いている。

## その他

- 入力 JSON のフィールド: `tool_name` はトップレベル、コマンドは **`tool_input.command`**、URL は **`tool_input.url`**(トップレベルの `.command`/`.url` ではない)。
- フック由来の deny/ask には目印 `🪝 [<hook名>] ` を理由文の先頭に付ける(Claude Code のデフォルト確認と区別するため)。
- Bash のブロックは `permissions.deny`(組込み権限エンジン、正常動作)にも寄せて多層防御にする。構文の穴は `.claude/rules/permissions-deny.md` 参照。
