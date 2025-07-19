const js = require('@eslint/js');
const jsdoc = require('eslint-plugin-jsdoc'); // Import the JSDoc plugin

module.exports = [
    js.configs.recommended,
    // Add the JSDoc plugin's recommended configuration
    // This often includes the `no-undefined-types` rule with `markVariablesAsUsed` already set
    jsdoc.configs['recommended'], // Use the recommended config from eslint-plugin-jsdoc
    {
        languageOptions: {
            ecmaVersion: 'latest',
        },
        rules: {
            'arrow-spacing': ['warn', { before: true, after: true }],
            'brace-style': ['error', '1tbs', { allowSingleLine: true }],
            'comma-spacing': 'error',
            'comma-style': 'error',
            curly: ['error', 'multi-line'],
            'dot-location': ['error', 'property'],
            'handle-callback-err': 'off',
            indent: ['error', 4],
            'keyword-spacing': 'error',
            'max-nested-callbacks': ['error', { max: 4 }],
            'max-statements-per-line': ['error', { max: 2 }],
            'no-console': 'off',
            'no-empty-function': 'error',
            'no-floating-decimal': 'error',
            'no-lonely-if': 'error',
            'no-multi-spaces': 'error',
            'no-multiple-empty-lines': ['error', { max: 2, maxEOF: 1, maxBOF: 0 }],
            'no-shadow': ['error', { allow: ['err', 'resolve', 'reject'] }],
            'no-trailing-spaces': ['error'],
            'no-var': 'error',
            'no-undef': 'off', // Keep this off if you're not using environments that define globals
            'object-curly-spacing': ['error', 'always'],
            'prefer-const': 'error',
            quotes: ['error', 'single'],
            semi: ['error', 'always'],
            'space-before-blocks': 'error',
            'space-before-function-paren': ['error', {
                anonymous: 'never',
                named: 'never',
                asyncArrow: 'always',
            }],
            'space-in-parens': 'error',
            'space-infix-ops': 'error',
            'space-unary-ops': 'error',
            'spaced-comment': 'error',
            yoda: 'error',

            // JSDoc rules
            'jsdoc/no-undefined-types': [
              'error',
              {
                'markVariablesAsUsed': true
              }
            ],

        },
    },
];