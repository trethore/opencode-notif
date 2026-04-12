import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';

export default defineConfig(
  {
    ignores: ['dist/**', 'node_modules/**', 'references/**'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  unicorn.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
        },
      ],
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/filename-case': 'off',
    },
  }
);
