const svelte = require('eslint-plugin-svelte');

module.exports = [
  {
    files: ['**/*.ts', '**/*.svelte'],
    plugins: { svelte },
    languageOptions: {
      parserOptions: { ecmaVersion: 2020, sourceType: 'module' },
    },
    processor: svelte.processors.svelte,
    rules: {
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
];
