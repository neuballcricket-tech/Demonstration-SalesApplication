import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Same convention TypeScript uses: a leading underscore marks an intentionally unused name
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        destructuredArrayIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      // House style: plain hyphen "-" in all product text
      'no-restricted-syntax': ['error',
        { selector: 'Literal[value=/—/]', message: 'Use a plain hyphen "-" (house style).' },
        { selector: 'TemplateElement[value.cooked=/—/]', message: 'Use a plain hyphen "-" (house style).' },
        { selector: 'JSXText[value=/—/]', message: 'Use a plain hyphen "-" (house style).' },
      ],
    },
  },
])
