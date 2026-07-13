---
globs: ['*.tsx', '*.ts']
---

# Next.js バージョン注意

このバージョンはトレーニングデータと異なるAPIや規約を持つ場合がある。コードを書く前に `node_modules/next/dist/docs/` の該当ガイドを読むこと。

# Server / Client コンポーネント

- `page.tsx` と `layout.tsx` は Server Component のまま（`'use client'` を付けない）
- `'use client'` はインタラクティブな操作が必要なコンポーネントにのみ付ける
- `components/tools/` 配下はすべて `'use client'`
