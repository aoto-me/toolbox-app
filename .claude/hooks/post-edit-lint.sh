#!/bin/bash
# Write/Edit 後に ESLint と Prettier を自動適用するフック
# stdin から JSON を受け取り、編集されたファイルパスを抽出して整形する

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    const parsed = JSON.parse(d);
    const p = parsed.tool_input?.file_path || parsed.tool_response?.filePath || '';
    if (p) process.stdout.write(p);
  });
")

if [ -n "$FILE_PATH" ]; then
  case "$FILE_PATH" in -*) exit 0;; esac
  npx eslint --fix -- "$FILE_PATH" 2>/dev/null
  npx prettier --write -- "$FILE_PATH" 2>/dev/null
fi

exit 0
