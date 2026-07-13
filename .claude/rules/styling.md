---
globs: ['*.scss', '*.css']
---

# スタイリング

- CSS Modules + SCSS を使う（`.module.scss`）
- インラインスタイル（`style={{ }}`）は使わない
- クラス名は **camelCase + BEM** のハイブリッド:
  - ブロック: `.taxCalculator`
  - エレメント: `.taxCalculator__inputField`
  - モディファイア: `.taxCalculator--active`
