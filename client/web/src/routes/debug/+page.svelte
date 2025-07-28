<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { apiClient } from '$lib/api/client';

	let debugInfo = {
		token: '',
		backendHealth: '',
		user: null as any,
		servers: null as any,
		error: ''
	};

	onMount(async () => {
		if (!browser) return;

		// Get token from localStorage
		debugInfo.token = localStorage.getItem('token') || 'No token found';

		try {
			// Test backend health
			const health = await apiClient.healthCheck();
			debugInfo.backendHealth = JSON.stringify(health, null, 2);

			// Test user info
			if (debugInfo.token !== 'No token found') {
				apiClient.setToken(debugInfo.token);
				const user = await apiClient.getCurrentUser();
				debugInfo.user = user;
			}

			// Test servers
			if (debugInfo.token !== 'No token found') {
				const servers = await apiClient.getServers();
				debugInfo.servers = servers;
			}
		} catch (err: any) {
			debugInfo.error = err.message || 'Unknown error';
		}
	});

	async function testLogin() {
		try {
			const response = await fetch('http://192.168.1.23:8081/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: 'testuser',
					password: 'password123!'
				})
			});
			const data = await response.json();
			if (data.token) {
				localStorage.setItem('token', data.token);
				debugInfo.token = data.token;
				window.location.reload();
			} else {
				debugInfo.error = data.error || 'Login failed';
			}
		} catch (err: any) {
			debugInfo.error = err.message || 'Unknown error';
		}
	}

	async function testSuperAdminLogin() {
		try {
			const response = await fetch('http://192.168.1.23:8081/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: 'superadmin',
					password: 'password123!'
				})
			});
			const data = await response.json();
			if (data.token) {
				localStorage.setItem('token', data.token);
				debugInfo.token = data.token;
				window.location.reload();
			} else {
				debugInfo.error = data.error || 'Superadmin login failed';
			}
		} catch (err: any) {
			debugInfo.error = err.message || 'Unknown error';
		}
	}
</script>

<svelte:head>
	<title>Debug - Fethur</title>
</svelte:head>

<div class="debug-page">
	<h1>🔧 Debug Information</h1>
	
	<div class="debug-section">
		<h2>Authentication</h2>
		<p><strong>Token:</strong> {debugInfo.token ? 'Present' : 'Missing'}</p>
			{#if debugInfo.token === 'No token found'}
		<button on:click={testLogin}>Login as testuser</button>
		<button on:click={testSuperAdminLogin}>Login as superadmin</button>
	{/if}
	</div>

	<div class="debug-section">
		<h2>Backend Health</h2>
		<pre>{debugInfo.backendHealth || 'Not tested'}</pre>
	</div>

	<div class="debug-section">
		<h2>Current User</h2>
		<pre>{debugInfo.user ? JSON.stringify(debugInfo.user, null, 2) : 'Not loaded'}</pre>
	</div>

	<div class="debug-section">
		<h2>Servers</h2>
		<pre>{debugInfo.servers ? JSON.stringify(debugInfo.servers, null, 2) : 'Not loaded'}</pre>
	</div>

	{#if debugInfo.error}
		<div class="debug-section error">
			<h2>Error</h2>
			<p>{debugInfo.error}</p>
		</div>
	{/if}
</div>

<style>
	.debug-page {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
		font-family: monospace;
	}

	.debug-section {
		margin-bottom: 2rem;
		padding: 1rem;
		border: 1px solid #ccc;
		border-radius: 4px;
	}

	.debug-section h2 {
		margin-top: 0;
		color: #333;
	}

	pre {
		background: #f5f5f5;
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
	}

	.error {
		border-color: #ff6b6b;
		background: #fff5f5;
	}

	button {
		background: #007bff;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
	}

	button:hover {
		background: #0056b3;
	}
</style> 