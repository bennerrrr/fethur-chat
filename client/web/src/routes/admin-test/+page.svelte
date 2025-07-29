<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { apiClient } from '$lib/api/client';

	let token = '';
	let user: any = null;
	let users: any[] = [];
	let error = '';

	onMount(async () => {
		if (!browser) return;
		
		token = localStorage.getItem('token') || 'No token';
		console.log('Token:', token);
		
		if (token !== 'No token') {
			apiClient.setToken(token);
			
			try {
				user = await apiClient.getCurrentUser();
				console.log('User:', user);
				
				if (user.role === 'admin' || user.role === 'super_admin') {
					users = await apiClient.getUsers();
					console.log('Users:', users);
				}
			} catch (err: any) {
				console.error('Error:', err);
				error = err.message;
			}
		}
	});

	async function loginAsAdmin() {
		try {
			const response = await fetch('http://localhost:8081/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: 'admin',
					password: 'password123!'
				})
			});
			const data = await response.json();
			if (data.token) {
				localStorage.setItem('token', data.token);
				window.location.reload();
			}
		} catch (err: any) {
			error = err.message;
		}
	}
</script>

<svelte:head>
	<title>Admin Test</title>
</svelte:head>

<div class="test-page">
	<h1>Admin Test Page</h1>
	
	<div class="test-section">
		<h2>Token Status</h2>
		<p>Token: {token ? 'Present' : 'Missing'}</p>
		{#if token === 'No token'}
			<button on:click={loginAsAdmin}>Login as Admin</button>
		{/if}
	</div>

	<div class="test-section">
		<h2>Current User</h2>
		{#if user}
			<pre>{JSON.stringify(user, null, 2)}</pre>
		{:else}
			<p>No user loaded</p>
		{/if}
	</div>

	<div class="test-section">
		<h2>Users (Admin Only)</h2>
		{#if users.length > 0}
			<pre>{JSON.stringify(users, null, 2)}</pre>
		{:else}
			<p>No users loaded</p>
		{/if}
	</div>

	{#if error}
		<div class="error">
			<h2>Error</h2>
			<p>{error}</p>
		</div>
	{/if}
</div>

<style>
	.test-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		background: var(--color-bg);
		color: var(--color-text);
		min-height: 100vh;
	}

	.test-section {
		margin-bottom: 2rem;
		padding: 1rem;
		border: 1px solid var(--color-border);
		border-radius: 8px;
		background: var(--color-surface);
	}

	.test-section h2 {
		color: var(--color-text);
		margin-bottom: 1rem;
	}

	pre {
		background: var(--color-primary);
		color: var(--color-text);
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		font-size: 0.875rem;
	}

	.error {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--color-error);
		color: var(--color-error);
		padding: 1rem;
		border-radius: 8px;
	}

	button {
		background: var(--color-accent);
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		cursor: pointer;
		font-weight: 500;
	}

	button:hover {
		background: var(--color-accent-hover);
	}
</style> 