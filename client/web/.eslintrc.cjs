module.exports = {
	root: true,
	extends: [
		'eslint:recommended',
		'plugin:@typescript-eslint/recommended',
		'plugin:svelte/recommended',
		'prettier'
	],
	ignorePatterns: ['build/', '.svelte-kit/', 'node_modules/'],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint'],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2022,
		extraFileExtensions: ['.svelte']
	},
	env: {
		browser: true,
		es2022: true,
		node: true
	},
	overrides: [
		{
			files: ['*.svelte'],
			parser: 'svelte-eslint-parser',
			parserOptions: {
				parser: '@typescript-eslint/parser'
			}
		}
	],
	rules: {
		'@typescript-eslint/no-unused-vars': [
			'warn', 
			{ 
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_'
			}
		],
		'@typescript-eslint/no-explicit-any': 'warn',
		'no-console': 'warn',
		'no-debugger': 'error',
		'svelte/valid-compile': 'warn'
	}
};