#!/bin/bash
# 全フックのロジック単体テストをまとめて実行。1つでも失敗したら exit 1。
# 手動でも SessionStart 自己診断(session-selfcheck.sh)からも呼ばれる。
DIR="$(cd "$(dirname "$0")" && pwd)"
rc=0
for t in "$DIR"/test-*.sh; do
    bash "$t" || rc=1
done
[ "$rc" -eq 0 ] && echo "== フックロジック単体テスト: 全PASS ==" || echo "== フックロジック単体テスト: FAIL あり =="
exit $rc
