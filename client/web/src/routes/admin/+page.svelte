<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { apiClient } from '$lib/api/client';
	import { LoadingSpinner } from '$lib/components/ui';

	let loading = true;
	let error = '';
	let settings = {
		guest_mode_enabled: false,
		auto_login_enabled: false,
		default_username: '',
		default_password: ''
	};
	let currentUser: any = null;

	onMount(async () => {
		try {
			// Check authentication
			if (browser) {
				const token = localStorage.getItem('token');
				if (!token) {
					goto('/');
					return;
				}
				apiClient.setToken(token);
			}

			// Get current user and check if admin
			currentUser = await apiClient.getCurrentUser();
			if (currentUser.role !== 'admin' && currentUser.role !== 'super_admin') {
				error = 'Access denied. Admin privileges required.';
				return;
			}

			// Get current settings
			const response = await fetch(`${apiClient.baseUrl}/api/settings`, {
				headers: {
					'Authorization': `Bearer ${apiClient.getToken()}`
				}
			});
			
			if (response.ok) {
				const data = await response.json();
				settings = {
					guest_mode_enabled: data.guest_mode_enabled === 'true',
					auto_login_enabled: data.auto_login_enabled === 'true',
					default_username: data.default_username || '',
					default_password: data.default_password || ''
				};
			}
		} catch (err) {
			console.error('Error:', err);
			error = 'Failed to load settings';
		} finally {
			loading = false;
		}
	});

	async function updateSettings() {
		try {
			const response = await fetch(`${apiClient.baseUrl}/api/settings`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${apiClient.getToken()}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(settings)
			});

			if (response.ok) {
				alert('Settings updated successfully!');
			} else {
				const data = await response.json();
				alert(`Failed to update settings: ${data.error}`);
			}
		} catch (err) {
			console.error('Error updating settings:', err);
			alert('Failed to update settings');
		}
	}

	function logout() {
		if (browser) {
			localStorage.removeItem('token');
			goto('/');
		}
	}
</script>

<svelte:head>
	<title>Admin Settings - Fethur</title>
</svelte:head>

<div class="admin-page">
	{#if loading}
		<div class="loading-screen">
			<LoadingSpinner size="lg" />
			<p>Loading admin settings...</p>
		</div>
	{:else if error}
		<div class="error-screen">
			<h2>❌ Error</h2>
			<p>{error}</p>
			<button on:click={() => window.location.reload()}>Retry</button>
		</div>
	{:else}
		<div class="admin-container">
			<header class="admin-header">
				<h1>⚙️ Admin Settings</h1>
				<div class="user-info">
					Welcome, {currentUser?.username || 'Admin'}! ({currentUser?.role})
				</div>
				<div class="header-actions">
					<a href="/chat" class="btn btn-secondary">Back to Chat</a>
					<button class="btn btn-danger" on:click={logout}>Logout</button>
				</div>
			</header>

			<main class="admin-main">
				<div class="settings-section">
					<h2>Authentication Settings</h2>
					
					<div class="setting-group">
						<label class="setting-label">
							<input 
								type="checkbox" 
								bind:checked={settings.guest_mode_enabled}
							/>
							<span class="setting-text">
								<strong>Enable Guest Mode</strong>
								<p>Allow users to access the chat without authentication</p>
							</span>
						</label>
					</div>

					<div class="setting-group">
						<label class="setting-label">
							<input 
								type="checkbox" 
								bind:checked={settings.auto_login_enabled}
							/>
							<span class="setting-text">
								<strong>Enable Auto Login</strong>
								<p>Automatically log users in with default credentials</p>
							</span>
						</label>
					</div>

					<div class="setting-group">
						<label class="setting-label">
							<span class="setting-text">
								<strong>Default Username</strong>
								<p>Username for auto login (required if auto login is enabled)</p>
							</span>
							<input 
								type="text" 
								bind:value={settings.default_username}
								placeholder="Enter default username"
								class="setting-input"
							/>
						</label>
					</div>

					<div class="setting-group">
						<label class="setting-label">
							<span class="setting-text">
								<strong>Default Password</strong>
								<p>Password for auto login (required if auto login is enabled)</p>
							</span>
							<input 
								type="password" 
								bind:value={settings.default_password}
								placeholder="Enter default password"
								class="setting-input"
							/>
						</label>
					</div>

					<div class="setting-actions">
						<button class="btn btn-primary" on:click={updateSettings}>
							💾 Save Settings
						</button>
					</div>
				</div>

				<div class="info-section">
					<h3>ℹ️ How it works</h3>
					<ul>
						<li><strong>Guest Mode:</strong> When enabled, users can access the chat without logging in</li>
						<li><strong>Auto Login:</strong> When enabled, users are automatically logged in with the default credentials</li>
						<li><strong>Default Credentials:</strong> The username and password used for auto login</li>
					</ul>
					
					<div class="warning">
						⚠️ <strong>Security Note:</strong> Auto login with default credentials should only be used in development or controlled environments.
					</div>
				</div>
			</main>
		</div>
	{/if}
</div>

<style>
	.admin-page {
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 20px;
	}

	.loading-screen, .error-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		color: white;
		text-align: center;
	}

	.admin-container {
		max-width: 800px;
		margin: 0 auto;
		background: white;
		border-radius: 12px;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.admin-header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 10px;
	}

	.admin-header h1 {
		margin: 0;
		font-size: 1.5rem;
	}

	.user-info {
		font-size: 0.9rem;
		opacity: 0.9;
	}

	.header-actions {
		display: flex;
		gap: 10px;
	}

	.admin-main {
		padding: 30px;
	}

	.settings-section {
		margin-bottom: 30px;
	}

	.settings-section h2 {
		margin: 0 0 20px 0;
		color: #333;
		font-size: 1.3rem;
	}

	.setting-group {
		margin-bottom: 20px;
		padding: 15px;
		border: 1px solid #e1e5e9;
		border-radius: 8px;
		background: #f8f9fa;
	}

	.setting-label {
		display: flex;
		align-items: flex-start;
		gap: 15px;
		cursor: pointer;
	}

	.setting-label input[type="checkbox"] {
		margin-top: 3px;
		transform: scale(1.2);
	}

	.setting-text {
		flex: 1;
	}

	.setting-text strong {
		display: block;
		margin-bottom: 5px;
		color: #333;
	}

	.setting-text p {
		margin: 0;
		color: #666;
		font-size: 0.9rem;
	}

	.setting-input {
		width: 100%;
		padding: 8px 12px;
		border: 1px solid #ddd;
		border-radius: 4px;
		font-size: 0.9rem;
		margin-top: 5px;
	}

	.setting-actions {
		margin-top: 20px;
		text-align: center;
	}

	.btn {
		padding: 10px 20px;
		border: none;
		border-radius: 6px;
		font-size: 0.9rem;
		cursor: pointer;
		text-decoration: none;
		display: inline-block;
		transition: all 0.2s;
	}

	.btn-primary {
		background: #667eea;
		color: white;
	}

	.btn-primary:hover {
		background: #5a6fd8;
	}

	.btn-secondary {
		background: #6c757d;
		color: white;
	}

	.btn-secondary:hover {
		background: #5a6268;
	}

	.btn-danger {
		background: #dc3545;
		color: white;
	}

	.btn-danger:hover {
		background: #c82333;
	}

	.info-section {
		background: #f8f9fa;
		padding: 20px;
		border-radius: 8px;
		border-left: 4px solid #667eea;
	}

	.info-section h3 {
		margin: 0 0 15px 0;
		color: #333;
	}

	.info-section ul {
		margin: 0 0 15px 0;
		padding-left: 20px;
	}

	.info-section li {
		margin-bottom: 8px;
		color: #555;
	}

	.warning {
		background: #fff3cd;
		border: 1px solid #ffeaa7;
		border-radius: 4px;
		padding: 12px;
		color: #856404;
		font-size: 0.9rem;
	}

	@media (max-width: 768px) {
		.admin-header {
			flex-direction: column;
			text-align: center;
		}

		.header-actions {
			width: 100%;
			justify-content: center;
		}

		.admin-main {
			padding: 20px;
		}
	}
</style> 