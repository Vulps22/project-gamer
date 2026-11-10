import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'class', format: ['PascalCase'] },
        { selector: 'interface', format: ['PascalCase'] },
        { selector: 'typeAlias', format: ['PascalCase'] },
        { selector: 'function', format: ['camelCase'] },
        { selector: 'method', format: ['camelCase'], leadingUnderscore: 'allow' },
        { selector: 'variable', modifiers: ['const'], format: ['camelCase', 'UPPER_CASE', 'PascalCase'] }
      ]
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'database/**', '**/*.js', '**/*.mjs', '**/*.test.ts']
  }
);
