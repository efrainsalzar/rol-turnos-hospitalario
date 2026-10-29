import { fixupConfigRules, fixupPluginRules } from '@eslint/compat';
import prettier from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import js from '@eslint/js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

const sharedPlugins = {
  prettier,
  react,
  'react-hooks': fixupPluginRules(reactHooks),
  'jsx-a11y': jsxA11y
};

const sharedSettings = {
  react: {
    version: 'detect'
  }
};

const sharedRules = {
  'react/jsx-filename-extension': 'off',
  'no-param-reassign': 'off',
  'react/prop-types': 'off',
  'react/require-default-props': 'off',
  'react/no-array-index-key': 'off',
  'react/react-in-jsx-scope': 'off',
  'react/jsx-props-no-spreading': 'off',
  'import/order': 'off',
  'no-console': 'off',
  'no-shadow': 'off',
  'import/no-cycle': 'off',
  'import/no-extraneous-dependencies': 'off',
  'jsx-a11y/label-has-associated-control': 'off',
  'jsx-a11y/no-autofocus': 'off',
  'react/jsx-uses-react': 'off',
  'react/jsx-uses-vars': 'error',
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',

  'no-restricted-imports': [
    'error',
    {
      patterns: ['@mui/*/*/*', '!@mui/material/test-utils/*']
    }
  ],

  'prettier/prettier': 'warn'
};

export default tseslint.config(
  ...fixupConfigRules(compat.extends('prettier')),

  // JS/JSX: remanentes de la plantilla Mantis, sin tipado — parser estandar de ESLint.
  {
    files: ['src/**/*.{js,jsx}'],
    plugins: sharedPlugins,
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: sharedSettings,
    rules: {
      ...sharedRules,
      'no-unused-vars': ['error', { vars: 'all', args: 'none' }]
    }
  },

  // TS/TSX: el frontend real del proyecto (ARQUITECTURA.md §13 exige TypeScript en todo
  // codigo nuevo). Antes de esto, ningun .tsx pasaba por ESLint en absoluto — el
  // bloque final del archivo (`files: ['src/**/*.{js,jsx}']` combinado con `ignores`)
  // dejaba cualquier .tsx sin ninguna configuracion que lo cubriera. Ver
  // docs/database/decisiones-tecnicas.md para el detalle de este hallazgo.
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
    plugins: sharedPlugins,
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      }
    },
    settings: sharedSettings,
    rules: {
      ...sharedRules,
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { vars: 'all', args: 'none' }]
    }
  },

  {
    ignores: ['node_modules/**', 'dist/**']
  }
);
