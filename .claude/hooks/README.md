# .claude/hooks — フック構成と経緯

このディレクトリの Claude Code フックの構成・設計理由・調査記録。
**保守ルールの要約は `.claude/rules/hooks.md`(自動ロード)にある。まずそちらを見ること。**

## 現在の構成(3ファイル)

| ファイル              | イベント / 登録               | 役割                                                                               |
| --------------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| `bash-guard.sh`       | PreToolUse / **matcher なし** | Bash の block(deny)/confirm(ask)を一手に処理。旧 `block-*`・`confirm-*` 11個を集約 |
| `confirm-webfetch.sh` | PreToolUse / `WebFetch`       | 外部ドメイン制御。信頼→allow / 未登録→ask                                          |
| `post-edit-lint.sh`   | PostToolUse / `Write\|Edit`   | Edit/Write 後の ESLint 整形                                                        |

## 健全性チェック(退行の早期警告)

フックは Claude Code の更新等でサイレントに発火しなくなることがある(本件がまさにそれ)。
2層で早期警告する仕組みを入れてある。

- **ロジック層(自動テスト)**: `.claude/hooks/tests/`。`bash .claude/hooks/tests/run-all.sh` で
  各フックが入力に対し正しい判定(deny/ask/allow/none)を返すか検証。いつでも手動実行可。
- **発火層(スモーク)**: 端末で `echo __hookcheck__` を実行 → 🪝 [bash-guard] の確認ダイアログが
  出れば PreToolUse は正常発火。**出ずに素通りしたら発火が退行している。**
  (ロジックテストは「コードの正しさ」しか見ない。発火退行はこのスモークでしか検知できない)

**自動発動**: `session-selfcheck.sh`(SessionStart フック)が
「**Claude Code のバージョン変化**」または「**未チェックのブランチで作業開始**」を検知したとき、
ロジックテストを走らせて結果と上記スモーク手順をセッション冒頭に出す。
状態は `.claude/hook-selfcheck-state.local.json`(gitignore 済み・リビルドでも残る)に記録。
→ この案内が出たら `echo __hookcheck__` を1回実行して発火を確認すること。

---

以下は、この構成に至った調査と解決の全記録(ポストモーテム)。

---

## 経緯サマリ【解決済み(2026-07-06)】

旧フック 13 個のうち実質1個しか動いていなかった状態から、全フックが実機で機能する状態に復旧した。

---

## TL;DR

- 症状: `.claude/settings.json` の `PreToolUse`(matcher: `Bash`)フックが**一切発火しない**。
  当初「PreToolUse 全般が壊れている」と誤認したが、実際は **`matcher:"Bash"` だけ**が不発だった。
- 根本原因は**4つ**が絡んでいた(下記)。
- 解決: matcher なしディスパッチャ `bash-guard.sh` に集約 + `confirm-webfetch.sh` を JSON 化。
- 実機検証済み: deny/ask/allow のいずれも live で機能することを確認。

---

## 発見した問題(4つ)

### 問題1: `matcher:"Bash"` の PreToolUse が発火しない(Claude Code のバグ)

- **証拠**: セッショントランスクリプト(`~/.claude/projects/-workspace/*.jsonl`)の実ログで、
  `PreToolUse:Bash` の hookName レコードが**ゼロ**。一方 `PostToolUse:Write/Edit`・
  `PreToolUse:WebFetch` は発火し、**matcher なし**のフックは Bash でも発火した(診断フックで実証)。
  → ディスパッチ機構は生きており、**照合文字列 `"Bash"` だけがマッチしていない**。
- **棄却した仮説**(すべて否定):
  - サンドボックス: `bwrap`(bubblewrap)未インストールで動作不能。`dangerouslyDisableSandbox` でも変化なし。
    `SandboxedBash` は表示名(`getToolUseSummary`)のみで、照合ツール名は `name:"Bash"` のまま。
  - `settings.local.json`: `hooks` キー無し。allow リスト外の `rm` でも素通り(auto-allow でもない)。
  - 権限モード: `permissionMode="default"`(bypass ではない)。
  - プラグイン: matcher なし PreToolUse を持つ `hookify` は未ロード。有効な `security-guidance` は
    PreToolUse を持たず、無効化しても `matcher:"Bash"` は不発 → **プラグイン無罪**。
  - devContainer リビルド: リビルド後も再現。ただしトランスクリプトはプロジェクト外にあり
    リビルドで消えるため「記録ゼロ = 一度も発火せず」ではない(以前は動いていた=リグレッション)。
- **既報告**(broad には既知だが、今回の切り分けの方が精密):
  [#71022](https://github.com/anthropics/claude-code/issues/71022)(非対話モードで per-turn フック不発・Open)、
  [#69260](https://github.com/anthropics/claude-code/issues/69260)(サブエージェント・Open)、
  [#6305](https://github.com/anthropics/claude-code/issues/6305)(Pre/Post 全滅・Open)、
  [#36389](https://github.com/anthropics/claude-code/issues/36389)(`Bash(git commit:*)` 形式・Closed)。
  「**matcher なしなら Bash で発火する**」まで切り分けた報告は見当たらず、今回のが最も具体的。
- 環境: devContainer 上の Claude Code 2.1.201、SDK/エージェントハーネス
  (`AI_AGENT=claude-code_2-1-201_agent`、`.sdk_bootstrap_spawned`、`agent-sdk-venv`)。

### 問題2: `/dev/tty` 依存が使用不可(Claude のバグではなく公式仕様)

- 公式ドキュメント明記: "command hooks run in their own session **without a controlling terminal
  as of v2.1.139**. …can't open `/dev/tty`"。**v2.1.139 以降の macOS/Linux 全フックに適用**。
- よって `confirm-*` 系の `read < /dev/tty` は必ず失敗(`/dev/tty: No such device or address`)。
- 公式の代替: stdout に JSON を返す。
  `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow|ask|deny","permissionDecisionReason":"…"}}`。
  ユーザーへの表示は `systemMessage`、端末シーケンスは `terminalSequence`。

### 問題3: 入力フィールドパスの誤り(旧フック共通の隠れバグ)

- 旧フックは `json.load(stdin).get('command')` / `.get('url')` と**トップレベル**を読んでいた。
- 実際は `tool_name` はトップレベルだが、コマンドは **`tool_input.command`**、URL は **`tool_input.url`**。
  (検証で確定)。→ 旧フックは仮に発火しても対象を読めず素通りしていた可能性が高い。

### 問題4: `confirm-webfetch` のホワイトリストが無効化していた

- PreToolUse フックは `permissionDecision:"allow"` を返して初めて標準プロンプトを抑制できる。
  `exit 0` は「標準フローへ進め」の意味で auto-approve ではない。
- 旧 `confirm-webfetch` は信頼ドメインで `exit 0` するだけだったため、**TRUSTED_DOMAINS が完全に無意味**
  (信頼・未登録どちらも標準プロンプトが出るだけ)。

---

## 対処

### bash-guard.sh(新規・Bash 系11フックを集約)

- **matcher なし(全ツール対象)** で登録し、中で `tool_name=="Bash"` を自前判定(問題1を回避)。
- 確認/ブロックは **`permissionDecision`(deny/ask)の JSON** で返す(問題2を回避)。
- 入力は **`tool_input.command`** から読む(問題3を修正。top-level フォールバックあり)。
- 旧 `block-*`(7)・`confirm-*`(4)の検出正規表現を全移植。deny を先、ask を後に評価。
- 全出力の理由文に目印 **`🪝 [bash-guard] `** を付与(デフォルト確認と区別。誤承認の再発防止)。

### confirm-webfetch.sh(書き換え・WebFetch 系)

- WebFetch matcher は発火するので matcher なし化は不要。`/dev/tty` を廃止し JSON 化(問題2)。
- **信頼ドメイン→`allow`(無確認)/ 未登録→`ask`(確認)** を返す(問題4を修正=ホワイトリスト実効化)。
- 入力は `tool_input.url` から読む(問題3)。目印 `🪝 [confirm-webfetch] `。
- なりすまし対策確認済み(`github.com.evil.example` は allow に落ちず ask)。

### 多層防御: permissions.deny 増強

- 組込み権限エンジンは正常動作するため、壊滅的操作を deny に追加(計36件:
  `rm -rf *`・`rm -fr *`・`sudo rm -rf*`・`git push origin +*`・`git push --force *`・`dd *`・`mkfs*`・`shred *` 等)。
  ホットリロードで即有効。フックとは独立した安全網。

---

## 元のフック → 対応結果

| 元のフック名                     | 用途                     |  以前  | 現在 | 対応                                 |
| -------------------------------- | ------------------------ | :----: | :--: | ------------------------------------ |
| `block-rm.sh`                    | rm 禁止                  | ❌不発 |  ✅  | bash-guard に deny 集約              |
| `block-main-branch.sh`           | main 直 commit/push 禁止 | ❌不発 |  ✅  | 〃 deny(ブランチ判定込)              |
| `block-sensitive-file-access.sh` | 機密ファイル参照禁止     | ❌不発 |  ✅  | 〃 deny                              |
| `block-remote-script-exec.sh`    | `curl\|bash` 禁止        | ❌不発 |  ✅  | 〃 deny                              |
| `block-chmod-777.sh`             | `chmod -R 777` 禁止      | ❌不発 |  ✅  | 〃 deny                              |
| `block-drop-sql.sh`              | `DROP TABLE` 禁止        | ❌不発 |  ✅  | 〃 deny                              |
| `block-env-secrets.sh`           | AWS/S3・env ダンプ禁止   | ❌不発 |  ✅  | 〃 deny                              |
| `confirm-git-push.sh`            | git push 確認            | ❌不発 |  ✅  | 〃 ask                               |
| `confirm-pr-create.sh`           | gh pr create 確認        | ❌不発 |  ✅  | 〃 ask                               |
| `confirm-npm-install.sh`         | npm install 確認         | ❌不発 |  ✅  | 〃 ask                               |
| `confirm-db-migrate.sh`          | DB migrate 確認          | ❌不発 |  ✅  | 〃 ask                               |
| `confirm-webfetch.sh`            | WebFetch ドメイン制御    | ⚠️半壊 |  ✅  | JSON 化・allow/ask・whitelist 実効化 |
| `post-edit-lint.sh`              | Edit/Write 後の整形      |   ✅   |  ✅  | 変更なし(元から正常)                 |

旧11スクリプト(block/confirm)は `.trash/hooks-old/` へ退避済み(最終削除はユーザー判断)。

---

## 実機検証の証拠

- `bash-guard.sh`: 別セッションのスモークで **deny(`rm`・`DROP TABLE`)即ブロック**、
  **ask(`git push --dry-run`)で 🪝 付きダイアログ→拒否可** を確認。単体テスト 25/25 pass。
- `confirm-webfetch.sh`: 信頼ドメイン(react.dev)への WebFetch が**無プロンプトで通過**=`allow` の live 動作を確認。
  単体テスト 9/9 pass。
- 補足(正直な記録): 検証初期、目印導入前に `npx tsx db/migrate.ts` の ask をデフォルト確認と誤認して
  承認が通り、dev DB に migrate が1回実行された(drizzle は未適用分のみ適用の冪等設計のため実害なしと判断)。
  → この一件が **🪝 目印導入**のきっかけ。

---

## ask の発火条件【解決(2026-07-06)】

一時「ask が default モードで機能しない疑い」として調査したが、**制御テストの結果それは誤報だった**。
`ask` は**本物の(＝Claude Code が"確認が要る"と判断する)操作では正しく機能する**。素通りするのは
`echo` や `--dry-run` のような**元から無害でネイティブに自動承認されるコマンド**だけで、そこでは ask が
無視される。確認したい本命の操作はすべて permission-worthy なので、ask は機能する。

**制御テスト結果**(ダイアログに 🪝 [bash-guard] 目印が出るかで判定):

| コマンド                     | 結果                             | 種別                 |
| ---------------------------- | -------------------------------- | -------------------- |
| `gh pr create --help`        | ✅ ask 発火(🪝ダイアログ→拒否可) | 本物の操作           |
| `git push --dry-run`         | ✅ ask 発火                      | 本物の操作           |
| `npm install <実パッケージ>` | ✅ ask 発火                      | 本物の操作           |
| `npx tsx db/migrate.ts`      | ✅ ask 発火(拒否で未実行)        | 本物の操作           |
| `echo __hookcheck__`         | ⭕ 素通り(無害・想定内)          | ただの echo          |
| `npm install --dry-run`      | ⭕ 素通り(無害・想定内)          | `--dry-run` は無操作 |

**なぜ誤報が生じたか**: 最初のスモーク/検証を `echo __hookcheck__` と `npm install --dry-run`
(どちらも Claude Code が自動承認する無害コマンド)で行ってしまい、「ask が素通り」と観測された。
本物の操作でテストし直したら ask は普通に効いていた。

**含意(重要)**:

- **confirm 系(git push / gh pr create / npm install / DB マイグレーション)の ask は実際に機能している。**
  AI 判断への後退も、deny への格上げも不要。
- 過去の「migrate が確認なく実行された」件は、**ask が出なかったのではなく、目印が無く default 確認と
  誤認して承認した**のが真相。目印 🪝 導入で区別できるようになり再発しにくい。
- **発火スモークだけは `echo`(無害)なので ask では素通りする**。そのため
  スモークセンチネル `__hookcheck__` は **deny** で判定するようにしてある(deny は無害コマンドでも強制される)。

**補足の切り分け**:

- `deny` は permissionMode に関わらず常に強制される(`rm` 等でブロック確認済み)。
- ロジック単体テストで一時 `git push(非main)`/`git commit(非main)` が FAIL したのは、
  `tests/test-bash-guard.sh` が `cwd:"/workspace"` 固定で呼ぶため bash-guard 内の
  `git branch --show-current` が**実行時点の実ブランチ**(その時 main)を見たテストのモック不備。
  非 main ブランチで実行すれば全 PASS(確認済み)。bash-guard 自体のバグではない。

## 保守メモ(今後のために)

- **Bash の block/confirm ルールを足すときは `bash-guard.sh` に `emit_deny`/`emit_ask` で追記する。**
  個別フックを新規作成して `matcher:"Bash"` に登録しても発火しないので厳禁。
- `matcher:"Bash"` は使わない。matcher なし + `tool_name` 判定が唯一効く経路。
- 将来 Anthropic が問題1のバグを直したら、`matcher:"Bash"` グループを復活させないこと(bash-guard と二重発火する)。
- WebFetch の許可は、フック(`allow` 返却)の代わりに `permissions.allow` の `WebFetch(domain:...)` でも制御可能。
- 関連ルール: `.claude/rules/permissions-deny.md`(deny 構文の穴)。
