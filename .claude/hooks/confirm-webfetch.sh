#!/bin/bash
# ============================================================================
# confirm-webfetch.sh — WebFetch のドメイン制御(JSON プロトコル版)
# ----------------------------------------------------------------------------
# WebFetch matcher は正常に発火するので matcher なし化は不要。
# 旧実装は /dev/tty で y/N を聞いていたが、v2.1.139 以降フックに制御端末が無く使用不可。
# また旧実装は信頼ドメインでも exit 0 しか返さず、TRUSTED_DOMAINS が実質無効化していた
# (組込み権限エンジンには影響せず、結局 全ドメインで標準プロンプトが出ていた)。
#
# 本実装は permissionDecision で明示制御する:
#   信頼ドメイン  → allow(自動許可・プロンプト無し)  ← これで初めてホワイトリストが機能する
#   未登録ドメイン → ask (確認ダイアログ)
#   URL/ドメイン不明 → 判断せず標準フローへ(exit 0)
#
# 入力: url は tool_input.url(旧実装の top-level .url は誤り。fallback あり)。
# ============================================================================
INPUT=$(cat)
URL=$(printf '%s' "$INPUT" | python3 -c "import json,sys; d=json.load(sys.stdin); ti=d.get('tool_input') or {}; print(ti.get('url', d.get('url','')))" 2>/dev/null)
DOMAIN=$(printf '%s' "$URL" | python3 -c "from urllib.parse import urlparse; import sys; print(urlparse(sys.stdin.read().strip()).netloc)" 2>/dev/null)

GUARD_MARK='🪝 [confirm-webfetch] '
emit() {  # $1=decision(allow/ask/deny) $2=reason
    python3 -c "import json,sys; print(json.dumps({'hookSpecificOutput':{'hookEventName':'PreToolUse','permissionDecision':sys.argv[1],'permissionDecisionReason':sys.argv[2]}}, ensure_ascii=False))" "$1" "$GUARD_MARK$2"
    exit 0
}

TRUSTED_DOMAINS=(
    "developer.mozilla.org"
    "react.dev"
    "nextjs.org"
    "nodejs.org"
    "typescriptlang.org"
    "github.com"
    "npmjs.com"
    "vercel.com"
    "web.dev"
    "w3.org"
    "support.apple.com"
    "www.apple.com"
    "orm.drizzle.team"
    "authjs.dev"
    "dndkit.com"
    "docs.aws.amazon.com"
    "sass-lang.com"
    "eslint.org"
    "prettier.io"
    "postgresql.org"
)

# ドメインが取れないときは判断しない(組込みの標準フローに委ねる)
[ -z "$DOMAIN" ] && exit 0

for trusted in "${TRUSTED_DOMAINS[@]}"; do
    if printf '%s' "$DOMAIN" | grep -qE "(^|\.)${trusted//./\\.}$"; then
        emit allow "信頼済みドメイン($DOMAIN)への WebFetch を自動許可しました。"
    fi
done

emit ask "未登録の外部サイト($DOMAIN)への WebFetch です。アクセスを許可しますか？"
