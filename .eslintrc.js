module.exports = {
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": [
        "standard",
        "prettier",
        "eslint:recommended",
        "plugin:jest/recommended",
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint",
        "jest"
    ],
    "ignorePatterns": ["v1Types.ts"],
    rules: {
      'comma-dangle': ['error', 'always-multiline'],
      'space-before-function-paren': ['error', {
          'anonymous': 'never',
          'named': 'never',
          'asyncArrow': 'always'
      }],
      'no-useless-constructor': 'off',
      '@typescript-eslint/no-useless-constructor': ['error'],
      '@typescript-eslint/no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
      'sort-imports': 'error',
      'no-param-reassign': 'error',
    },
    overrides: [{
      files: [
        'src/*.test.ts'
      ],
      env: {
          jest: true
      }
    }],
};
