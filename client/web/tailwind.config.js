/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				// Custom color palette for Fethur
				primary: {
					50: '#f0f9ff',
					100: '#e0f2fe',
					200: '#bae6fd',
					300: '#7dd3fc',
					400: '#38bdf8',
					500: '#0ea5e9',
					600: '#0284c7',
					700: '#0369a1',
					800: '#075985',
					900: '#0c4a6e'
				},
				secondary: {
					50: '#f8fafc',
					100: '#f1f5f9',
					200: '#e2e8f0',
					300: '#cbd5e1',
					400: '#94a3b8',
					500: '#64748b',
					600: '#475569',
					700: '#334155',
					800: '#1e293b',
					900: '#0f172a'
				},
				accent: {
					50: '#f0fdf4',
					100: '#dcfce7',
					200: '#bbf7d0',
					300: '#86efac',
					400: '#4ade80',
					500: '#22c55e',
					600: '#16a34a',
					700: '#15803d',
					800: '#166534',
					900: '#14532d'
				},
				// Chat-specific colors
				success: '#22c55e',
				warning: '#f59e0b',
				error: '#ef4444',
				info: '#3b82f6'
			},
			fontFamily: {
				sans: [
					'Inter',
					'-apple-system',
					'BlinkMacSystemFont',
					'Segoe UI',
					'Roboto',
					'Oxygen',
					'Ubuntu',
					'Cantarell',
					'sans-serif'
				],
				mono: [
					'JetBrains Mono',
					'Fira Code',
					'Monaco',
					'Consolas',
					'Liberation Mono',
					'Courier New',
					'monospace'
				]
			},
			spacing: {
				'18': '4.5rem',
				'88': '22rem',
				'128': '32rem'
			},
			animation: {
				'fade-in': 'fadeIn 0.3s ease-in-out',
				'slide-in': 'slideIn 0.3s ease-out',
				'pulse-slow': 'pulse 2s infinite',
				'typing': 'typing 1s ease-in-out infinite alternate'
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: '0' },
					'100%': { opacity: '1' }
				},
				slideIn: {
					'0%': { transform: 'translateY(-10px)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				typing: {
					'0%': { opacity: '0.4' },
					'100%': { opacity: '1' }
				}
			},
			boxShadow: {
				'soft': '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
				'medium': '0 4px 12px 0 rgba(0, 0, 0, 0.15)',
				'hard': '0 8px 24px 0 rgba(0, 0, 0, 0.25)'
			},
			borderRadius: {
				'xl': '0.75rem',
				'2xl': '1rem',
				'3xl': '1.5rem'
			}
		}
	},
	plugins: [
		require('@tailwindcss/typography'),
		// Custom plugin for chat-specific utilities
		function({ addUtilities }) {
			const newUtilities = {
				'.scrollbar-thin': {
					'scrollbar-width': 'thin',
					'scrollbar-color': 'rgb(203 213 225) transparent'
				},
				'.scrollbar-none': {
					'scrollbar-width': 'none',
					'-ms-overflow-style': 'none',
					'&::-webkit-scrollbar': {
						display: 'none'
					}
				},
				'.chat-message': {
					'word-wrap': 'break-word',
					'overflow-wrap': 'break-word'
				}
			}
			addUtilities(newUtilities)
		}
	],
	darkMode: 'class'
}