const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const parser = require('@typescript-eslint/parser');
const globals = require('globals');

/** @type {import('eslint').Linter.Config[]} */
module.exports = [
  {
    ignores: ['dist/', 'node_modules/', '.opencode/'],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
      globals: {
        ...globals.node,
        ...globals.es2020,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tseslint.configs['flat/eslint-recommended'].rules,
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
