#!/bin/bash
# confirm-webfetch.sh のロジック単体テスト。fail>0 なら exit 1。
H="/workspace/.claude/hooks/confirm-webfetch.sh"
pass=0; fail=0
run() { # $1=説明 $2=期待(allow/ask/none) $3=url
  local input out got
  input=$(python3 -c "import json,sys; print(json.dumps({'tool_name':'WebFetch','tool_input':{'url':sys.argv[1]}}))" "$3")
  out=$(printf '%s' "$input" | bash "$H")
  if [ -z "$out" ]; then got="none"; else
    got=$(printf '%s' "$out" | python3 -c "import json,sys; print(json.load(sys.stdin)['hookSpecificOutput']['permissionDecision'])" 2>/dev/null || echo PARSE_ERR)
  fi
  if [ "$got" = "$2" ]; then pass=$((pass+1)); else echo "❌ $1 期待:$2 実際:$got"; fail=$((fail+1)); fi
}

run "github.com"            allow "https://github.com/anthropics/claude-code/issues/1"
run "サブドメイン docs.aws" allow "https://docs.aws.amazon.com/s3/index.html"
run "mdn"                   allow "https://developer.mozilla.org/en-US/"
run "nextjs.org"            allow "https://nextjs.org/docs"
run "example.com"           ask   "https://example.com/foo"
run "偽github(なりすまし)"  ask   "https://github.com.evil.example/x"
run "ランダムなブログ"       ask   "https://some-random-blog.dev/post"
run "URL空"                 none  ""
run "URLでない文字列"        none  "not-a-url"

echo "confirm-webfetch: pass=$pass fail=$fail"
[ "$fail" -eq 0 ]
