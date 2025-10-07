import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import path from 'path'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    settings: {
      'import/resolver': {
        alias: {
          map: [
            ['@', path.resolve(__dirname, './src')],
            ['@components', path.resolve(__dirname, './src/components')],
            ['@pages', path.resolve(__dirname, './src/pages')],
            ['@assets', path.resolve(__dirname, './src/assets')],
            ['@utils', path.resolve(__dirname, './src/utils')],
            ['@hooks', path.resolve(__dirname, './src/hooks')],
            ['@store', path.resolve(__dirname, './src/store')],
            ['@api', path.resolve(__dirname, './src/api')],
            ['@features', path.resolve(__dirname, './src/features')],
            ['@layouts', path.resolve(__dirname, './src/layouts')],
            ['@routes', path.resolve(__dirname, './src/routes')],
            ['@styles', path.resolve(__dirname, './src/styles')],
          ],
          extensions: ['.ts', '.tsx', '.js', '.jsx']
        }
      }
    }
  },
])
