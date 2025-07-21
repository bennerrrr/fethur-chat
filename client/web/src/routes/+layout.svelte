<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { authActions, isAuthenticated } from '$lib/stores/auth';
	import { browser } from '$app/environment';

	// Initialize auth on mount
	onMount(() => {
		if (browser) {
			authActions.initialize();
		}
	});
</script>

<main class="min-h-screen bg-secondary-50 dark:bg-secondary-900">
	<slot />
</main>