<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { authStore, authActions } from '$lib/stores/auth';
	import { apiClient } from '$lib/api/client';
	import ErrorBoundary from '$lib/components/ui/ErrorBoundary.svelte';

	let initialized = false;

	onMount(async () => {
		if (!browser) return;

		try {
			// Initialize auth store
			await authActions.initialize();
			
			// Set up auth state subscription
			const unsubscribe = authStore.subscribe(async (auth) => {
				if (!auth.isInitialized) return;
				
				const token = localStorage.getItem('auth_token');
				const currentPath = $page.url.pathname;
				
				// Handle authentication state changes
				if (auth.user && auth.token) {
					// User is authenticated
					apiClient.setToken(auth.token);
					
					// Redirect from auth pages to appropriate destination
					if (currentPath === '/' || currentPath === '/login' || currentPath === '/register') {
						if (auth.user.role === 'admin' || auth.user.role === 'super_admin') {
							goto('/admin');
						} else {
							goto('/chat');
						}
					}
				} else {
					// User is not authenticated
					apiClient.clearToken();
					
					// Redirect from protected pages to login
					const protectedRoutes = ['/chat', '/admin', '/dashboard'];
					if (protectedRoutes.includes(currentPath)) {
						goto('/');
					}
				}
			});
			
			initialized = true;
		} catch (error) {
			console.error('Layout initialization failed:', error);
		}
	});
</script>

<!-- Global CSS Variables -->
<style>
	:global(:root) {
		/* Modern Color Palette - High Contrast Theme */
		--color-bg: #000000;
		--color-surface: #111111;
		--color-primary: #222222;
		--color-accent: #3b82f6;
		--color-accent-hover: #2563eb;
		--color-text: #ffffff;
		--color-text-muted: #cccccc;
		--color-border: #333333;
		--color-glass: rgba(17, 17, 17, 0.95);
		--color-glass-border: rgba(51, 51, 51, 0.6);
		--color-success: #10b981;
		--color-error: #ef4444;
		--color-warning: #f59e0b;
		--color-info: #06b6d4;
		
		/* Enhanced Shadows */
		--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.1);
		--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.15);
		--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.2);
		--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.25);
		
		/* Modern Typography */
		--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
		--font-size-xs: 0.75rem;
		--font-size-sm: 0.875rem;
		--font-size-base: 1rem;
		--font-size-lg: 1.125rem;
		--font-size-xl: 1.25rem;
		--font-size-2xl: 1.5rem;
		--font-size-3xl: 1.875rem;
		
		/* Line Heights */
		--line-height-tight: 1.25;
		--line-height-normal: 1.5;
		--line-height-relaxed: 1.75;
		
		/* Border Radius */
		--radius-sm: 0.375rem;
		--radius-md: 0.5rem;
		--radius-lg: 0.75rem;
		--radius-xl: 1rem;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		font-family: var(--font-family);
		font-size: var(--font-size-base);
		line-height: var(--line-height-normal);
		background: var(--color-bg);
		color: var(--color-text);
		overflow-x: hidden;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}

	:global(.glass-card) {
		background: var(--color-glass);
		backdrop-filter: blur(16px);
		border: 1px solid var(--color-glass-border);
		border-radius: var(--radius-xl);
		padding: 2rem;
		box-shadow: var(--shadow-lg);
		transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	}

	:global(.btn) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		border-radius: var(--radius-md);
		font-weight: 500;
		font-size: var(--font-size-sm);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		text-decoration: none;
		border: none;
		cursor: pointer;
		font-family: var(--font-family);
	}

	:global(.btn-primary) {
		background: var(--color-accent);
		color: white;
	}

	:global(.btn-primary:hover) {
		background: var(--color-accent-hover);
		transform: translateY(-1px);
		box-shadow: var(--shadow-md);
	}

	:global(.loading-spinner) {
		width: 20px;
		height: 20px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	:global(.error-message) {
		background: rgba(239, 68, 68, 0.1);
		color: var(--color-error);
		padding: 1rem;
		border-radius: var(--radius-md);
		border: 1px solid rgba(239, 68, 68, 0.2);
		margin-bottom: 1rem;
		font-size: var(--font-size-sm);
	}

	:global(.success-message) {
		background: rgba(16, 185, 129, 0.1);
		color: var(--color-success);
		padding: 1rem;
		border-radius: var(--radius-md);
		border: 1px solid rgba(16, 185, 129, 0.2);
		margin-bottom: 1rem;
		font-size: var(--font-size-sm);
	}

	.app-container {
		min-height: 100vh;
		background: var(--color-bg);
	}

	.loading-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		gap: 1rem;
		color: var(--color-text-muted);
	}

	.loading-screen p {
		margin: 0;
		font-size: var(--font-size-sm);
		font-weight: 500;
	}
</style>

<!-- Main Layout -->
<ErrorBoundary>
	<div class="app-container">
		{#if !initialized}
			<div class="loading-screen">
				<div class="loading-spinner"></div>
				<p>Initializing...</p>
			</div>
		{:else}
			<slot />
		{/if}
	</div>
</ErrorBoundary> 