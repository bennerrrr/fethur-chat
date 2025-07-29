<script lang="ts">
	import { onMount } from 'svelte';
	
	let error: Error | null = null;
	
	onMount(() => {
		window.addEventListener('error', (event) => {
			console.error('Error caught by boundary:', event.error);
			error = event.error;
		});
		
		window.addEventListener('unhandledrejection', (event) => {
			console.error('Unhandled promise rejection:', event.reason);
			error = new Error(event.reason);
		});
	});
	
	function reset() {
		error = null;
		window.location.reload();
	}
</script>

{#if error}
	<div class="error-boundary">
		<div class="error-content">
			<h2>Something went wrong</h2>
			<p>An unexpected error occurred. Please try refreshing the page.</p>
			<button class="btn btn-primary" on:click={reset}>
				🔄 Refresh Page
			</button>
		</div>
	</div>
{:else}
	<slot />
{/if}

<style>
	.error-boundary {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 2rem;
		background: var(--color-bg);
	}
	
	.error-content {
		text-align: center;
		max-width: 400px;
	}
	
	.error-content h2 {
		color: var(--color-error);
		margin-bottom: 1rem;
	}
	
	.error-content p {
		color: var(--color-text-muted);
		margin-bottom: 2rem;
	}
</style> 