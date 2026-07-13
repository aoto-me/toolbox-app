import nextVitals from 'eslint-config-next/core-web-vitals';
import prettier from 'eslint-config-prettier';
import perfectionist from 'eslint-plugin-perfectionist';
import security from 'eslint-plugin-security';
import unusedImports from 'eslint-plugin-unused-imports';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['*.mjs'],
        },
        // allowDefaultProject の簡易プロジェクトには @types/node の ImportMeta 拡張が届かず error 型になる
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  security.configs.recommended,
  perfectionist.configs['recommended-natural'],
  {
    plugins: {
      'unused-imports': unusedImports,
    },
    rules: {
      '@next/next/no-img-element': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // unused-imports が代わりに担うため off にする
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      'perfectionist/sort-imports': [
        'error',
        { newlinesBetween: 0, order: 'asc', type: 'natural' },
      ],
      'security/detect-object-injection': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        { args: 'after-used', argsIgnorePattern: '^_', vars: 'all', varsIgnorePattern: '^_' },
      ],
    },
  },
  prettier,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
]);

export default eslintConfig;
