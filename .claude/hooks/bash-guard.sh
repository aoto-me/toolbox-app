#!/bin/bash
# ============================================================================
# bash-guard.sh — matcher なし PreToolUse ディスパッチャ(本実装)
# ----------------------------------------------------------------------------
# 旧 .claude/hooks/{block-*,confirm-*}.sh(matcher:"Bash" 登録)を1本に集約したもの。
# 2つの Claude Code 由来の問題を同時に回避する:
#   (1) matcher:"Bash" が発火しない既知バグ
#       → matcher なし(全ツール対象)で登録し、中で tool_name=="Bash" を自前判定。
#         (session-7/8 で「matcher なしは Bash で発火」「deny/ask とも尊重」を実証)
#   (2) /dev/tty 依存が v2.1.139 以降 使用不可(公式仕様)
#       → 確認/ブロックは JSON プロトコル(permissionDecision)で行う。
#
# 入力: tool_name はトップレベル、command は tool_input.command(検証で確定)。
#       旧フックは top-level .command を読んでいたが誤り。ここは tool_input.command
#       を優先し、念のため top-level .command にフォールバック。
#
# 評価順: 先に deny(ブロック)、次に ask(確認)。最初に一致したものを返して終了。
# ============================================================================
INPUT=$(cat)

TOOL=$(printf '%s' "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('tool_name',''))" 2>/dev/null)
[ "$TOOL" != "Bash" ] && exit 0

CMD=$(printf '%s' "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); ti=d.get('tool_input') or {}; print(ti.get('command', d.get('command','')))" 2>/dev/null)
CWD=$(printf '%s' "$INPUT" | python3 -c "import json,sys; print(json.load(sys.stdin).get('cwd','/workspace'))" 2>/dev/null)

# バックスラッシュ+改行(シェルの行継続)はスペースに正規化してから判定する。
# `git reset \`<改行>`  --hard` のように改行で分断するだけで、改行をまたがない
# 前提の正規表現(本スクリプト内の全パターン共通)をすり抜けられるため(実機検証で確認済み)。
CMD="${CMD//$'\\\n'/ }"

# 複数キーワードを「同一コマンド区切り内」でのみ結合させるための共通セパレータ。
# `\n` を文字クラス内に直接書く案は2通りとも実機で問題が出たため、POSIXの
# `[:cntrl:]` を使う: (1)シングルクォートの `\n` はPOSIX的には「バックスラッシュと
# nという2文字」と解釈されうる(GNU grepは拡張的にニューラインとして解釈するが、
# 他のgrep実装では保証されない。自動セキュリティレビューで指摘)。
# (2)ANSI-Cクォート($'...')で実改行バイトを直接埋め込むと、grepがパターン文字列
# 自体を改行で複数パターンに分割してしまい `[^;&|` が未閉じの括弧として壊れる
# (実機検証で確認済み・"Unmatched [" エラー)。`[:cntrl:]`はこの両方を回避できる。
SAME_CMD_SEP='[^;&|[:cntrl:]]*'

# 目印: このフック由来の deny/ask であることを一目で分かるよう、理由文の先頭に必ず付ける。
# Claude Code のデフォルト確認と区別するため。
GUARD_MARK='🪝 [bash-guard] '
# ツールをブロックする(理由つき)
emit_deny() {
    python3 -c "import json,sys; print(json.dumps({'hookSpecificOutput':{'hookEventName':'PreToolUse','permissionDecision':'deny','permissionDecisionReason':sys.argv[1]+sys.argv[2]}}, ensure_ascii=False))" "$GUARD_MARK" "$1"
    exit 0
}
# ユーザーに確認(y/N)を出す(Claude Code 本体の許可ダイアログ経由)
emit_ask() {
    python3 -c "import json,sys; print(json.dumps({'hookSpecificOutput':{'hookEventName':'PreToolUse','permissionDecision':'ask','permissionDecisionReason':sys.argv[1]+sys.argv[2]}}, ensure_ascii=False))" "$GUARD_MARK" "$1"
    exit 0
}
match() { printf '%s' "$CMD" | grep -qE "$1"; }
matchi() { printf '%s' "$CMD" | grep -qiE "$1"; }

# ========================= 発火スモーク用センチネル =========================
# `echo __hookcheck__` を実行して 🪝 [bash-guard] でブロックされれば PreToolUse は正常発火。
# ブロックされず素通りしたら発火が退行している(→ .claude/hooks/README.md 参照)。
# ※ deny を使う理由: このハーネスでは ask が素通りする疑いがあり、確実に観測できる deny で判定する。
#   これはダミーのブロックであり実害はない(echo が実行されないだけ)。
if match '__hookcheck__'; then
    emit_deny "【フック発火チェック】これが見えたら PreToolUse は正常に発火しています(ダミーの拒否・無視してOK)。"
fi

# ========================= deny(ブロック)=========================

# rm(旧 block-rm)
if match '(^|\s|;|&|\||\()rm\s'; then
    emit_deny "rm は禁止されています。代わりに mkdir -p .trash && mv <対象> .trash/ を使ってください。"
fi

# main ブランチへの直接 commit/push(旧 block-main-branch)
if match '(^|\s|;|&&|\|)git (commit|push)\b'; then
    BRANCH=$(git -C "$CWD" branch --show-current 2>/dev/null)
    if [ "$BRANCH" = "main" ]; then
        emit_deny "main ブランチへの直接 commit/push は禁止されています。ブランチを切って PR 経由で作業してください。"
    fi
fi

# 機密ファイル参照(旧 block-sensitive-file-access)
for pattern in \
    '\.env(\.|"|'"'"'|[[:space:]]|$)' \
    '\.ssh/' \
    '\.pem([^a-zA-Z]|$)' \
    '\.key([^a-zA-Z]|$)' \
    '\.p12([^a-zA-Z]|$)' \
    'secrets/' \
    'credentials/'; do
    if match "$pattern"; then
        emit_deny "機密ファイル(.env/.ssh/*.pem/*.key/*.p12/secrets/credentials)を参照するコマンドは、手段を問わず禁止されています。"
    fi
done

# curl/wget | shell(旧 block-remote-script-exec)
if match '(curl|wget)[^|]*\|[[:space:]]*(sudo[[:space:]]+)?(bash|sh|zsh)([[:space:]]|$)'; then
    emit_deny "curl/wget で取得したスクリプトを未確認のままシェルに渡して実行するパターンは禁止されています。"
fi

# curl/wget をプロセス置換・コマンド置換経由で実行(パイプ直結ではない迂回パターン)
# ※ [[:space:]]は改行も含むため、改行を挟まないよう明示的に除外する
#   (git系パターンと同じ理由。複数行コミットメッセージでの誤検出を防ぐ)。
if match "(bash|sh|zsh|source)[ \t]*<\\([ \t]*(curl|wget)[ \t]" || match "\\beval\\b${SAME_CMD_SEP}\\\$\\([ \t]*(curl|wget)[ \t]"; then
    emit_deny "curl/wget の出力をプロセス置換・コマンド置換経由でシェルに渡して実行するパターンは禁止されています。"
fi

# git reset --hard / git clean -f / force push(permissions.denyは先頭一致のみのため、
# `git -C <path> ...` や引数順序違い(-df, -fd等)、sudo経由をここで補完する)
# ※ キーワード間は固定のフラグ文法ではなく「; & | 改行を含まない任意の文字列」として許容する。
#   フラグを `-{1,2}[A-Za-z0-9_.-]+` のような厳密な文法で解析しようとすると、
#   `--git-dir=.git`(=区切り)や `-C "my repo"`(スペースを含むクォート値)のような
#   実際のgitが受け付ける書き方を想定から外してしまい、検知をすり抜けられる
#   (自動セキュリティレビューで指摘・実機検証で確認済み)。
#   同一コマンド区切り内での語順だけを見ることで、フラグの文法に依存せず検知する。
GIT_START='(^|\s|;|&&|\||\(|`)git\b'
if match "${GIT_START}${SAME_CMD_SEP}\breset\b${SAME_CMD_SEP}--hard\b"; then
    emit_deny "git reset --hard は禁止されています。未コミットの変更が失われる可能性があります。"
fi
if match "${GIT_START}${SAME_CMD_SEP}\bclean\b${SAME_CMD_SEP}(-[a-zA-Z]*f[a-zA-Z]*(\s|$)|--force\b)"; then
    emit_deny "git clean -f(未追跡ファイルの強制削除)は禁止されています。"
fi
if match "${GIT_START}${SAME_CMD_SEP}\bpush\b${SAME_CMD_SEP}(\s(-f|--force)(\s|$)|\s\+[^ \t;&|[:cntrl:]]+)"; then
    emit_deny "git push --force(force push)は禁止されています。リモートの履歴を書き換える危険があります。"
fi

# docker compose の破壊的操作(ボリューム削除・強制削除。同一コマンド区切り内での語順のみを見る)
if match "(^|\s|;|&&|\||\(|\`)docker\s+compose${SAME_CMD_SEP}\b(down|rm)\b${SAME_CMD_SEP}(-v\b|--volumes\b|-f\b|--force\b)"; then
    emit_deny "docker compose down/rm へのボリューム削除・強制オプションは禁止されています。データが失われる可能性があります。"
fi

# chmod -R 777 系(旧 block-chmod-777)
# ※ chmod・再帰フラグ・パーミッションの3つを独立したmatch呼び出しのANDで見ると、
#   複数行コミットメッセージ等でこれらの語が別々の行に散らばっただけでも誤検出する
#   (git系パターンと同じ原因。実機検証で確認済み)。1つのmatch呼び出しに結合し、
#   同一行内での語順(両方の順序)を要求することで誤検出を防ぐ。
#   ※ 末尾の境界は `(\s|$)` のような「消費する」形だと、連結時に手前のグループが
#   区切り文字を欲張って消費してしまい、後続グループの先頭境界(`[^0-9]`等)が
#   判定対象の文字を失ってすり抜ける(実機検証で確認済み)。消費しない `\b` に統一する。
FULL_PERM='\b0?777\b|\b(a|ugo)[+=]rwx\b'
RECURSIVE_FLAG='(^|\s)-[a-zA-Z]*R[a-zA-Z]*\b|--recursive\b'
if match "chmod${SAME_CMD_SEP}(${RECURSIVE_FLAG})${SAME_CMD_SEP}(${FULL_PERM})" || match "chmod${SAME_CMD_SEP}(${FULL_PERM})${SAME_CMD_SEP}(${RECURSIVE_FLAG})"; then
    emit_deny "777 等の全権限をディレクトリ配下に再帰的に付与するコマンドは禁止されています。"
fi
if match "find\s.*-exec\s+chmod\s${SAME_CMD_SEP}(${FULL_PERM})"; then
    emit_deny "find でファイルを走査しながら 777 等の全権限を付与するコマンドは禁止されています。"
fi

# DROP TABLE / DATABASE(旧 block-drop-sql)
if matchi 'drop[[:space:]]+(table|database)'; then
    emit_deny "DROP TABLE / DROP DATABASE を含むコマンドは禁止されています。"
fi

# AWS認証情報の直接操作・環境変数ダンプ(旧 block-env-secrets)
# 「aws/s3という単語を含むか」ではなく「実際に認証情報を扱う操作か」で判定する。
# (単語一致だと lib/s3.ts の参照やコミットメッセージでの言及まで誤検知するため)
# "aws"単体だと複数行コミットメッセージ等で行頭に来ただけの文章も拾ってしまうため、
# 実際のCLIサブコマンドが続く形(aws s3 ...等)に限定する。
# サブコマンド一覧は網羅的ではない(defense-in-depthの一層であり唯一の防御ではない)。
# --profile 等のフラグが aws とサブコマンドの間に入るケースにも対応する。
if match '(^|\s|;|&&|\||\(|`)aws(\s+-{1,2}[a-zA-Z0-9_-]+(\s+[^ \t;&|]+)?)*\s+(s3|s3api|sts|iam|ec2|rds|dynamodb|lambda|cloudformation|ecs|eks|logs|ssm|kms|secretsmanager|configure|ecr|cloudwatch|route53|acm|elb|elbv2|autoscaling|sso|organizations|sagemaker|sqs|sns|cognito-idp|bedrock|athena|glue|apigateway|batch|cloudfront|cloudtrail|eventbridge|kinesis|redshift|opensearch|rekognition|transcribe|translate|workspaces|backup|appsync|waf|guardduty|securityhub|macie|support|budgets|ce)\b'; then
    emit_deny "aws CLIコマンドの実行は、本番の認証情報を扱うため禁止されています。"
fi
if match '\.aws/(credentials|config)([^a-zA-Z]|$)'; then
    emit_deny "AWS認証情報ファイル(~/.aws/credentials, ~/.aws/config)への参照は禁止されています。"
fi
# echo/cat等の直後に限定せず、$VARの形での参照そのものを検知する
# (別変数への代入経由やcurlへの受け渡しでの漏洩を防ぐため)。
# $を必須にすることで、変数名を説明する地の文への誤検知は起きない。
if match '\$\{?(AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN|AWS_S3_ACCESS_KEY_ID|AWS_S3_SECRET_ACCESS_KEY)\b'; then
    emit_deny "AWS認証情報の環境変数を出力しようとするコマンドは禁止されています。"
fi
if match '(^|[^0-9A-Za-z])A(KIA|SIA|IDA|ROA)[0-9A-Z]{16}([^0-9A-Za-z]|$)'; then
    emit_deny "AWSアクセスキーID形式の文字列を含むコマンドは禁止されています。"
fi
if match '(^|;|&&|\|)[[:space:]]*(env|printenv)[[:space:]]*($|\||;|&&|>)'; then
    emit_deny "環境変数を丸ごとダンプするコマンドは禁止されています。特定の変数名を指定してください。"
fi

# ========================= ask(確認)=========================
# DB マイグレーション・gh pr create・npm install/add の確認は、動的な分岐ロジックが
# 不要な単純パターンのため、ネイティブの permissions.ask(.claude/settings.json)に
# 移行済み。ask は allow より常に優先される(具体性に関わらない)ため、
# settings.local.json の広い allow(`npx tsx *` 等)があっても確認は機能する。
# git push(非main)は main ブランチ判定という動的ロジックが必要なため、
# ネイティブルールで表現できず、ここに残す。

# git push(main は上で deny 済み。ここは非 main の push、旧 confirm-git-push)
if match 'git push'; then
    emit_ask "git push を実行しようとしています。実行しますか？"
fi

exit 0
