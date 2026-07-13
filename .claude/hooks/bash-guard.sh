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

# chmod -R 777 系(旧 block-chmod-777)
FULL_PERM='(^|[^0-9])0?777([^0-9]|$)|(^|[^a-zA-Z])(a|ugo)[+=]rwx([^a-zA-Z]|$)'
RECURSIVE_FLAG='(^|\s)-[a-zA-Z]*R[a-zA-Z]*(\s|$)|--recursive'
if match 'chmod' && match "$RECURSIVE_FLAG" && match "$FULL_PERM"; then
    emit_deny "777 等の全権限をディレクトリ配下に再帰的に付与するコマンドは禁止されています。"
fi
if match 'find\s.*-exec\s+chmod\s' && match "$FULL_PERM"; then
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

# DB マイグレーション(旧 confirm-db-migrate)
if match 'tsx +db/migrate\.ts|drizzle-kit +migrate'; then
    emit_ask "DB マイグレーションを実行しようとしています。内容を確認して許可しますか？"
fi

# gh pr create(旧 confirm-pr-create)
if match 'gh pr create'; then
    emit_ask "gh pr create を実行しようとしています。PR 作成後は CI チェック→自動マージ→本番デプロイまで自動で進みます。実行しますか？"
fi

# git push(main は上で deny 済み。ここは非 main の push、旧 confirm-git-push)
if match 'git push'; then
    emit_ask "git push を実行しようとしています。実行しますか？"
fi

# npm install / add(旧 confirm-npm-install)
if match 'npm (install|i|add) .+'; then
    emit_ask "パッケージのインストールを検出しました。インストールしますか？"
fi

exit 0
