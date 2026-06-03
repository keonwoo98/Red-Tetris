import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import prettier from 'eslint-config-prettier';

const noThis = {
  selector: 'ThisExpression',
  message:
    'SPEC: client code must be functional — `this` is forbidden (only allowed in custom Error subclasses).',
};

export default tseslint.config(
  { ignores: ['**/dist/**', '**/coverage/**', '**/*.config.{js,ts}'] },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  // ---------- CLIENT: ban `this`, enforce functional style ----------
  {
    files: ['packages/client/src/**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': 'warn',
      // HARD SPEC RULE: no `this` anywhere in the browser code
      'no-restricted-syntax': ['error', noThis],
      'no-invalid-this': 'error',
    },
  },

  // exception: custom Error subclasses may use `this`
  {
    files: ['packages/client/src/**/errors/**/*.ts', 'packages/client/src/**/*.error.ts'],
    rules: { 'no-restricted-syntax': 'off' },
  },

  // ---------- SERVER: OOP allowed (classes / this required) ----------
  {
    files: ['packages/server/src/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: { 'no-restricted-syntax': 'off' },
  },

  // shared = pure, framework-agnostic, also ban `this`
  {
    files: ['packages/shared/src/**/*.ts'],
    rules: { 'no-restricted-syntax': ['error', noThis] },
  },

  prettier, // turn off stylistic rules; Prettier owns formatting
);
