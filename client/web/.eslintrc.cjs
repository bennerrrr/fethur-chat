module.exports = {
	root: true,
	extends: [
		'eslint:recommended',
		'@typescript-eslint/recommended',
		'@typescript-eslint/recommended-requiring-type-checking',
		'@typescript-eslint/strict',
		'plugin:svelte/recommended',
		'plugin:svelte/prettier',
		'prettier'
	],
	parser: '@typescript-eslint/parser',
	plugins: ['@typescript-eslint', 'import', 'unicorn'],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2022,
		extraFileExtensions: ['.svelte'],
		project: './tsconfig.json'
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
			},
			rules: {
				// Relax some strict TypeScript rules for Svelte files
				'@typescript-eslint/no-unsafe-member-access': 'warn',
				'@typescript-eslint/no-unsafe-call': 'warn',
				'@typescript-eslint/no-unsafe-assignment': 'warn',
				'@typescript-eslint/no-unsafe-return': 'warn',
				'@typescript-eslint/no-unsafe-argument': 'warn',

				// Svelte-specific rules
				'svelte/no-unused-svelte-ignore': 'error',
				'svelte/no-dom-manipulating': 'error',
				'svelte/no-dupe-else-if-blocks': 'error',
				'svelte/no-dupe-on-directives': 'error',
				'svelte/no-dupe-style-properties': 'error',
				'svelte/no-dupe-use-directives': 'error',
				'svelte/no-dynamic-slot-name': 'error',
				'svelte/no-export-load-in-svelte-module-in-kit-pages': 'error',
				'svelte/no-not-function-handler': 'error',
				'svelte/no-object-in-text-mustaches': 'error',
				'svelte/no-reactive-functions': 'error',
				'svelte/no-reactive-literals': 'error',
				'svelte/no-shorthand-style-property-overrides': 'error',
				'svelte/no-unknown-style-directive-property': 'error',
				'svelte/no-unused-class-name': 'warn',
				'svelte/no-useless-mustaches': 'error',
				'svelte/prefer-class-directive': 'error',
				'svelte/prefer-style-directive': 'error',
				'svelte/require-store-reactive-access': 'error',
				'svelte/valid-compile': 'error'
			}
		},
		{
			files: ['*.test.ts', '*.test.js', '*.spec.ts', '*.spec.js'],
			rules: {
				'@typescript-eslint/no-non-null-assertion': 'off',
				'@typescript-eslint/no-explicit-any': 'off',
				'@typescript-eslint/no-empty-function': 'off'
			}
		},
		{
			files: ['vite.config.ts', 'vitest.config.ts', 'svelte.config.js', 'tailwind.config.js'],
			rules: {
				'import/no-default-export': 'off'
			}
		}
	],
	rules: {
		// TypeScript Rules
		'@typescript-eslint/no-unused-vars': [
			'error', 
			{ 
				argsIgnorePattern: '^_',
				varsIgnorePattern: '^_',
				caughtErrorsIgnorePattern: '^_'
			}
		],
		'@typescript-eslint/explicit-function-return-type': 'off',
		'@typescript-eslint/explicit-module-boundary-types': 'off',
		'@typescript-eslint/no-explicit-any': 'warn',
		'@typescript-eslint/prefer-const': 'error',
		'@typescript-eslint/no-non-null-assertion': 'warn',
		'@typescript-eslint/no-inferrable-types': 'error',
		'@typescript-eslint/prefer-nullish-coalescing': 'error',
		'@typescript-eslint/prefer-optional-chain': 'error',
		'@typescript-eslint/prefer-as-const': 'error',
		'@typescript-eslint/no-unnecessary-type-assertion': 'error',
		'@typescript-eslint/no-unnecessary-condition': 'warn',
		'@typescript-eslint/prefer-string-starts-ends-with': 'error',
		'@typescript-eslint/prefer-includes': 'error',
		'@typescript-eslint/no-floating-promises': 'error',
		'@typescript-eslint/await-thenable': 'error',
		'@typescript-eslint/no-misused-promises': 'error',
		'@typescript-eslint/require-await': 'error',
		'@typescript-eslint/return-await': ['error', 'in-try-catch'],
		'@typescript-eslint/prefer-readonly': 'warn',
		'@typescript-eslint/prefer-readonly-parameter-types': 'off', // Too strict for most cases
		'@typescript-eslint/switch-exhaustiveness-check': 'error',
		'@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
		'@typescript-eslint/consistent-type-exports': 'error',
		'@typescript-eslint/no-import-type-side-effects': 'error',

		// General ESLint Rules
		'no-console': ['warn', { allow: ['warn', 'error'] }],
		'no-debugger': 'error',
		'no-alert': 'error',
		'no-var': 'error',
		'prefer-const': 'error',
		'prefer-arrow-callback': 'error',
		'prefer-template': 'error',
		'object-shorthand': 'error',
		'quote-props': ['error', 'as-needed'],
		'no-nested-ternary': 'warn',
		'no-unneeded-ternary': 'error',
		'no-duplicate-imports': 'error',
		'no-useless-rename': 'error',
		'no-useless-computed-key': 'error',
		'no-useless-constructor': 'error',
		'no-useless-return': 'error',
		'no-lonely-if': 'error',
		'prefer-exponentiation-operator': 'error',
		'prefer-numeric-literals': 'error',
		'prefer-object-spread': 'error',
		'prefer-rest-params': 'error',
		'prefer-spread': 'error',
		'spaced-comment': ['error', 'always', { 
			markers: ['/'],
			exceptions: ['-', '+', '=', '*', '!', '?']
		}],
		'curly': ['error', 'all'],
		'eqeqeq': ['error', 'always', { null: 'ignore' }],
		'no-else-return': 'error',
		'no-return-assign': 'error',
		'no-return-await': 'off', // Handled by @typescript-eslint/return-await
		'no-throw-literal': 'error',
		'no-param-reassign': ['error', { props: false }],
		'no-implicit-coercion': 'error',
		'no-sequences': 'error',
		'no-eval': 'error',
		'no-implied-eval': 'error',
		'no-new-func': 'error',

		// Import Rules
		'import/order': [
			'error',
			{
				groups: [
					'builtin',
					'external',
					'internal',
					'parent',
					'sibling',
					'index',
					'type'
				],
				'newlines-between': 'always',
				alphabetize: {
					order: 'asc',
					caseInsensitive: true
				}
			}
		],
		'import/no-duplicates': 'error',
		'import/no-unresolved': 'off', // TypeScript handles this
		'import/no-cycle': 'error',
		'import/no-self-import': 'error',
		'import/no-useless-path-segments': 'error',
		'import/newline-after-import': 'error',
		'import/no-default-export': 'warn', // Prefer named exports

		// Unicorn Rules (Modern JavaScript practices)
		'unicorn/better-regex': 'error',
		'unicorn/catch-error-name': 'error',
		'unicorn/consistent-destructuring': 'error',
		'unicorn/consistent-function-scoping': 'error',
		'unicorn/error-message': 'error',
		'unicorn/escape-case': 'error',
		'unicorn/expiring-todo-comments': 'warn',
		'unicorn/explicit-length-check': 'error',
		'unicorn/filename-case': [
			'error',
			{
				cases: {
					camelCase: true,
					pascalCase: true,
					kebabCase: true
				}
			}
		],
		'unicorn/new-for-builtins': 'error',
		'unicorn/no-array-for-each': 'warn',
		'unicorn/no-console-spaces': 'error',
		'unicorn/no-for-loop': 'error',
		'unicorn/no-hex-escape': 'error',
		'unicorn/no-instanceof-array': 'error',
		'unicorn/no-lonely-if': 'error',
		'unicorn/no-new-array': 'error',
		'unicorn/no-new-buffer': 'error',
		'unicorn/no-unsafe-regex': 'error',
		'unicorn/no-unused-properties': 'warn',
		'unicorn/no-useless-undefined': 'error',
		'unicorn/prefer-array-find': 'error',
		'unicorn/prefer-array-flat-map': 'error',
		'unicorn/prefer-array-index-of': 'error',
		'unicorn/prefer-array-some': 'error',
		'unicorn/prefer-default-parameters': 'error',
		'unicorn/prefer-includes': 'error',
		'unicorn/prefer-modern-dom-apis': 'error',
		'unicorn/prefer-negative-index': 'error',
		'unicorn/prefer-number-properties': 'error',
		'unicorn/prefer-optional-catch-binding': 'error',
		'unicorn/prefer-set-has': 'error',
		'unicorn/prefer-spread': 'error',
		'unicorn/prefer-string-slice': 'error',
		'unicorn/prefer-string-starts-ends-with': 'error',
		'unicorn/prefer-string-trim-start-end': 'error',
		'unicorn/prefer-ternary': 'error',
		'unicorn/prevent-abbreviations': [
			'error',
			{
				replacements: {
					props: false,
					params: false,
					args: false,
					ref: false,
					env: false,
					temp: false,
					tmp: false
				}
			}
		],
		'unicorn/throw-new-error': 'error'
	},

	// Global settings
	settings: {
		'import/resolver': {
			typescript: {
				alwaysTryTypes: true,
				project: './tsconfig.json'
			}
		}
	}
}; 