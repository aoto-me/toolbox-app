#!/bin/bash
# ============================================================================
# session-selfcheck.sh — SessionStart 自己診断フック
# ----------------------------------------------------------------------------
# 目的: 今回のような「フックがサイレントに発火しなくなる」退行の早期警告。
# トリガー(いずれか):
#   ① Claude Code のバージョンが前回から変わった
#   ② まだ自己診断していないブランチで作業を始めた(新規ブランチ検知)
# トリガー時にやること:
#   - フックのロジック単体テスト(tests/run-all.sh)を実行し PASS/FAIL を報告
#   - 「発火スモーク」の手順を案内(echo __hookcheck__ で 🪝 ダイアログが出るか)
# 状態は /workspace 配下に保存(devContainer リビルドでも残り、更新後にちゃんと発火する)。
# ============================================================================
STATE="/workspace/.claude/hook-selfcheck-state.local.json"
HOOKS_DIR="/workspace/.claude/hooks"

VER=$(claude --version 2>/dev/null | head -1)
BRANCH=$(git -C /workspace branch --show-current 2>/dev/null)

PREV_VER=$(python3 -c "import json;print(json.load(open('$STATE')).get('version',''))" 2>/dev/null)
KNOWN_BRANCH=$(python3 -c "import json,sys; print('yes' if sys.argv[1] in json.load(open('$STATE')).get('checked_branches',[]) else '')" "$BRANCH" 2>/dev/null)

REASONS=""
if [ -n "$VER" ] && [ "$VER" != "$PREV_VER" ]; then
    REASONS="${REASONS}・Claude Code バージョン変化: ${PREV_VER:-（初回）} → ${VER}\n"
fi
if [ -n "$BRANCH" ] && [ -z "$KNOWN_BRANCH" ]; then
    REASONS="${REASONS}・新規ブランチ検知: ${BRANCH}\n"
fi

# トリガー無し → 静かに終了(状態も変えない)
[ -z "$REASONS" ] && exit 0

# ロジック単体テスト
TESTOUT=$(bash "$HOOKS_DIR/tests/run-all.sh" 2>&1); TESTRC=$?

echo "🪝 フック定期点検（異常ではありません）。以下を検知したので、念のため確認します:"
printf "%b" "$REASONS"
if [ "$TESTRC" -eq 0 ]; then
    echo "・ロジック単体テスト: ✅ 全PASS(問題なし)"
else
    echo "・ロジック単体テスト: ❌ FAIL あり(下記。要確認)"
    printf '%s\n' "$TESTOUT" | grep -E "❌|fail=|FAIL" | head -20
fi
echo "・発火の実確認(任意・30秒): 端末で  echo __hookcheck__  を実行。🪝 [bash-guard] でブロックされれば PreToolUse は正常発火（想定どおり・OK）。もしブロックされず素通りしたら発火退行の可能性 → .claude/hooks/README.md を参照。"

# 状態更新(バージョン記録 + ブランチ追加)
python3 - "$STATE" "$VER" "$BRANCH" <<'PY'
import json, os, sys
path, ver, branch = sys.argv[1], sys.argv[2], sys.argv[3]
d = {}
if os.path.exists(path):
    try: d = json.load(open(path))
    except Exception: d = {}
if ver: d['version'] = ver
b = set(d.get('checked_branches', []))
if branch: b.add(branch)
d['checked_branches'] = sorted(b)
json.dump(d, open(path, 'w'), ensure_ascii=False, indent=2)
PY
exit 0
