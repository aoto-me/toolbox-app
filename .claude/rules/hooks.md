# フック(PreToolUse / PostToolUse)

Claude Code のフックには、この環境固有の制約が2つある。**知らずに素朴に書くと動かない。**
詳しい経緯・証拠は `.claude/hooks/README.md`。

## 制約1: `matcher:"Bash"` は発火しない(Claude Code のバグ)

- `PreToolUse` で `matcher: "Bash"` を指定したフックは**一切発火しない**(`WebFetch` や `Write|Edit` は正常)。
- **matcher なし(全ツール対象)なら Bash でも発火する。**
- したがって **Bash に対する block/confirm は、個別フックを新規作成せず `.claude/hooks/bash-guard.sh`(matcher なし)に追記する。**
  中で `tool_name=="Bash"` を判定し、`emit_deny`(ブロック)/`emit_ask`(確認)を呼ぶだけ。
- 新しく `matcher:"Bash"` のフックを settings.json に登録しないこと(発火しない)。

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

## その他

- 入力 JSON のフィールド: `tool_name` はトップレベル、コマンドは **`tool_input.command`**、URL は **`tool_input.url`**(トップレベルの `.command`/`.url` ではない)。
- フック由来の deny/ask には目印 `🪝 [<hook名>] ` を理由文の先頭に付ける(Claude Code のデフォルト確認と区別するため)。
- Bash のブロックは `permissions.deny`(組込み権限エンジン、正常動作)にも寄せて多層防御にする。構文の穴は `.claude/rules/permissions-deny.md` 参照。
