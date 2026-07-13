---
globs: ['**/*']
---

# ファイル削除

ファイルやディレクトリを削除するときは `.trash/` に移動する（`rm` はフックでブロックされる）。

```bash
mkdir -p .trash && mv path/to/file .trash/
```

最終的な確認と削除はユーザーが行う。
