<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { LoadingSpinner } from '$lib/components/ui';
	import { apiClient } from '$lib/api/client';

	let loading = true;
	let error = '';
	let currentUser: any = null;
	let backendAvailable = false;

	onMount(async () => {
		try {
			// Check authentication
			if (browser) {
				const token = localStorage.getItem('token');
				if (!token) {
					goto('/');
					return;
				}
				// Set the token in the API client
				apiClient.setToken(token);
			}

			// Try to check backend availability and get user info
			try {
				await apiClient.healthCheck();
				backendAvailable = true;
				
				// Get current user info
				currentUser = await apiClient.getCurrentUser();
			} catch (err) {
				console.warn('Backend not available or authentication failed:', err);
				backendAvailable = false;
				
				// Fallback to mock user for demonstration
				currentUser = {
					id: 1,
					username: 'TestUser',
					email: 'test@example.com'
				};
			}

		} catch (err) {
			console.error('Error:', err);
			error = 'Failed to load chat';
		} finally {
			loading = false;
		}
	});

	function logout() {
		if (browser) {
			localStorage.removeItem('token');
			goto('/');
		}
	}
</script>

<svelte:head>
	<title>Fethur Chat</title>
</svelte:head>

<div class="chat-page">
	{#if loading}
		<div class="loading-screen">
			<LoadingSpinner size="lg" />
			<p>Loading chat...</p>
		</div>
	{:else if error}
		<div class="error-screen">
			<h2>❌ Error</h2>
			<p>{error}</p>
			<button on:click={() => window.location.reload()}>Retry</button>
		</div>
	{:else}
		<div class="chat-container">
			<header class="chat-header">
				<h1>💬 Fethur Chat</h1>
				<div class="connection-status">
					{#if backendAvailable}
						<span class="status-online">🟢 Online</span>
					{:else}
						<span class="status-offline">🔴 Offline Mode</span>
					{/if}
				</div>
				<div class="user-info">
					Welcome, {currentUser?.username || 'User'}!
				</div>
				<button class="logout-btn" on:click={logout}>Logout</button>
			</header>

			<main class="chat-main">
				<div class="message-area">
					<div class="welcome-message">
						<h2>🎉 Welcome to Fethur!</h2>
						<p>Your lightweight Discord alternative is ready!</p>
						
						{#if !backendAvailable}
							<div class="offline-notice">
								<h3>⚠️ Backend Server Offline</h3>
								<p>The backend server is not currently available. This is a demonstration of the frontend interface.</p>
								<p><strong>To enable full functionality:</strong></p>
								<ul>
									<li>Start the backend server (make sure it's running on port 8081)</li>
									<li>Refresh this page</li>
								</ul>
							</div>
						{:else}
							<p><em>All systems operational! Enhanced features are being loaded...</em></p>
						{/if}
					</div>
				</div>

				<div class="message-input">
					<input 
						type="text" 
						placeholder={backendAvailable ? "Type a message..." : "Backend offline - messaging disabled"}
						class="input-field"
						disabled={!backendAvailable}
					/>
					<button class="send-btn" disabled={!backendAvailable}>Send</button>
				</div>
			</main>
		</div>
	{/if}
</div>

<style>
	.chat-page {
		height: 100vh;
		background-color: #1a1a1a;
		color: #ffffff;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	.loading-screen, .error-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		gap: 1rem;
		text-align: center;
	}

	.error-screen button {
		background-color: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		cursor: pointer;
		font-weight: 500;
		transition: background-color 0.2s;
	}

	.error-screen button:hover {
		background-color: #2563eb;
	}

	.chat-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.chat-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		background-color: #2d2d2d;
		border-bottom: 1px solid #404040;
		flex-shrink: 0;
		gap: 1rem;
	}

	.chat-header h1 {
		margin: 0;
		font-size: 1.5rem;
		font-weight: 600;
		color: #3b82f6;
	}

	.connection-status {
		display: flex;
		align-items: center;
		font-size: 0.875rem;
	}

	.status-online {
		color: #10b981;
	}

	.status-offline {
		color: #ef4444;
	}

	.user-info {
		color: #6b7280;
		font-size: 0.875rem;
		flex: 1;
		text-align: center;
	}

	.logout-btn {
		background-color: #ef4444;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 0.375rem;
		cursor: pointer;
		font-weight: 500;
		transition: background-color 0.2s;
	}

	.logout-btn:hover {
		background-color: #dc2626;
	}

	.chat-main {
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.message-area {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: #1a1a1a;
		padding: 2rem;
	}

	.welcome-message {
		text-align: center;
		max-width: 700px;
	}

	.welcome-message h2 {
		color: #3b82f6;
		margin: 0 0 1rem 0;
		font-size: 2rem;
	}

	.welcome-message p {
		color: #6b7280;
		margin: 0.75rem 0;
		line-height: 1.6;
		font-size: 1.125rem;
	}

	.offline-notice {
		background-color: #2d2d2d;
		border: 1px solid #404040;
		border-radius: 0.75rem;
		padding: 1.5rem;
		margin-top: 2rem;
		text-align: left;
	}

	.offline-notice h3 {
		color: #f59e0b;
		margin: 0 0 1rem 0;
		font-size: 1.25rem;
	}

	.offline-notice p {
		margin: 0.5rem 0;
		font-size: 1rem;
	}

	.offline-notice ul {
		margin: 1rem 0;
		padding-left: 1.5rem;
		color: #9ca3af;
	}

	.offline-notice li {
		margin: 0.5rem 0;
	}

	.message-input {
		display: flex;
		gap: 1rem;
		padding: 1rem 1.5rem;
		background-color: #2d2d2d;
		border-top: 1px solid #404040;
		flex-shrink: 0;
	}

	.input-field {
		flex: 1;
		background-color: #1a1a1a;
		border: 1px solid #404040;
		border-radius: 0.5rem;
		padding: 0.75rem 1rem;
		color: #ffffff;
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	.input-field:focus {
		outline: none;
		border-color: #3b82f6;
	}

	.input-field::placeholder {
		color: #6b7280;
	}

	.input-field:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background-color: #0f0f0f;
	}

	.send-btn {
		background-color: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		cursor: pointer;
		font-weight: 500;
		transition: background-color 0.2s;
	}

	.send-btn:hover:not(:disabled) {
		background-color: #2563eb;
	}

	.send-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background-color: #4b5563;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.chat-header {
			padding: 0.75rem 1rem;
			flex-wrap: wrap;
		}

		.chat-header h1 {
			font-size: 1.25rem;
		}

		.user-info {
			order: 3;
			flex-basis: 100%;
			text-align: left;
			margin-top: 0.5rem;
		}

		.welcome-message {
			padding: 1rem;
		}

		.welcome-message h2 {
			font-size: 1.5rem;
		}

		.offline-notice {
			padding: 1rem;
		}

		.message-input {
			padding: 0.75rem 1rem;
			gap: 0.75rem;
		}
	}
</style> 