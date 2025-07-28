<script lang="ts">
	import { onMount } from 'svelte';

	let user: any = null;
	let settings: any = {};
	let servers: any[] = [];
	let channels: any[] = [];
	let loading = true;
	let error = '';
	let activeTab = 'overview';
	let showCreateModal = false;
	let newServer = { name: '', description: '' };
	let newChannel = { name: '', description: '', serverId: '' };

	onMount(async () => {
		const token = localStorage.getItem('token');
		if (!token) {
			window.location.href = '/';
			return;
		}

		try {
			// Get user profile
			const response = await fetch('/api/user/profile', {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});

			if (response.ok) {
				user = await response.json();
			} else {
				localStorage.removeItem('token');
				window.location.href = '/';
				return;
			}

			// Get settings if user is admin
			if (user.role === 'super_admin' || user.role === 'admin') {
				const settingsResponse = await fetch('/api/settings', {
					headers: {
						'Authorization': `Bearer ${token}`
					}
				});
				if (settingsResponse.ok) {
					settings = await settingsResponse.json();
				}
			}

			// Get servers and channels
			await loadServersAndChannels(token);
		} catch (err) {
			error = 'Failed to load dashboard';
		} finally {
			loading = false;
		}
	});

	async function loadServersAndChannels(token: string) {
		try {
			const serversResponse = await fetch('/api/servers', {
				headers: {
					'Authorization': `Bearer ${token}`
				}
			});
			if (serversResponse.ok) {
				servers = await serversResponse.json();
			}

			// Load channels for each server
			for (const server of servers) {
				const channelsResponse = await fetch(`/api/servers/${server.id}/channels`, {
					headers: {
						'Authorization': `Bearer ${token}`
					}
				});
				if (channelsResponse.ok) {
					const serverChannels = await channelsResponse.json();
					channels.push(...serverChannels.map((ch: any) => ({ ...ch, serverName: server.name })));
				}
			}
		} catch (err) {
			console.error('Failed to load servers/channels:', err);
		}
	}

	async function createServer() {
		const token = localStorage.getItem('token');
		if (!token) return;

		try {
			const response = await fetch('/api/servers', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(newServer)
			});

			if (response.ok) {
				await loadServersAndChannels(token);
				newServer = { name: '', description: '' };
				showCreateModal = false;
			}
		} catch (err) {
			console.error('Failed to create server:', err);
		}
	}

	async function createChannel() {
		const token = localStorage.getItem('token');
		if (!token || !newChannel.serverId) return;

		try {
			const response = await fetch(`/api/servers/${newChannel.serverId}/channels`, {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ name: newChannel.name, description: newChannel.description })
			});

			if (response.ok) {
				await loadServersAndChannels(token);
				newChannel = { name: '', description: '', serverId: '' };
				showCreateModal = false;
			}
		} catch (err) {
			console.error('Failed to create channel:', err);
		}
	}

	function logout() {
		localStorage.removeItem('token');
		window.location.href = '/';
	}

	function isAdmin() {
		return user?.role === 'super_admin' || user?.role === 'admin';
	}
</script>

{#if loading}
	<div class="glass-card">
		<div class="loading-container">
			<div class="loading-text">Loading Dashboard...</div>
			<div class="loading-spinner"></div>
		</div>
	</div>
{:else}
	<div class="dashboard-container">
		<!-- Header -->
		<div class="dashboard-header">
			<div class="header-left">
				<h1 class="welcome-text">Welcome back, {user?.username}! 👋</h1>
				<div class="user-badge">
					<span class="role-badge {user?.role}">{user?.role?.replace('_', ' ')}</span>
					<span class="user-id">ID: {user?.id}</span>
				</div>
			</div>
			<div class="header-right">
				<button on:click={logout} class="logout-btn">
					🚪 Logout
				</button>
			</div>
		</div>

		{#if error}
			<div class="error-message">{error}</div>
		{/if}

		<!-- Navigation Tabs -->
		<div class="tab-navigation">
			<button 
				class="tab-btn {activeTab === 'overview' ? 'active' : ''}" 
				on:click={() => activeTab = 'overview'}
			>
				📊 Overview
			</button>
			<button 
				class="tab-btn {activeTab === 'chat' ? 'active' : ''}" 
				on:click={() => activeTab = 'chat'}
			>
				💬 Chat
			</button>
			{#if isAdmin()}
				<button 
					class="tab-btn {activeTab === 'admin' ? 'active' : ''}" 
					on:click={() => activeTab = 'admin'}
				>
					⚙️ Admin
				</button>
			{/if}
		</div>

		<!-- Tab Content -->
		<div class="tab-content">
			{#if activeTab === 'overview'}
				<div class="overview-grid">
					<!-- Quick Stats -->
					<div class="stats-card">
						<div class="stats-icon">🏠</div>
						<div class="stats-content">
							<div class="stats-number">{servers.length}</div>
							<div class="stats-label">Servers</div>
						</div>
					</div>
					
					<div class="stats-card">
						<div class="stats-icon">📢</div>
						<div class="stats-content">
							<div class="stats-number">{channels.length}</div>
							<div class="stats-label">Channels</div>
						</div>
					</div>
					
					<div class="stats-card">
						<div class="stats-icon">👥</div>
						<div class="stats-content">
							<div class="stats-number">-</div>
							<div class="stats-label">Online Users</div>
						</div>
					</div>
					
					<div class="stats-card">
						<div class="stats-icon">💬</div>
						<div class="stats-content">
							<div class="stats-number">-</div>
							<div class="stats-label">Messages Today</div>
						</div>
					</div>
				</div>

				<!-- Recent Activity -->
				<div class="section-card">
					<h3 class="section-title">Recent Activity</h3>
					<div class="activity-list">
						<div class="activity-item">
							<div class="activity-icon">🎉</div>
							<div class="activity-content">
								<div class="activity-text">Welcome to Feathur!</div>
								<div class="activity-time">Just now</div>
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if activeTab === 'chat'}
				<div class="chat-navigation">
					<h3 class="section-title">Quick Access</h3>
					
					<!-- Main Chat Card -->
					<a href="/chat" class="nav-card primary-card">
						<div class="card-icon">💬</div>
						<div class="card-content">
							<h4 class="card-title">Main Chat Interface</h4>
							<p class="card-description">Access the full Discord-like chat experience</p>
						</div>
						<div class="card-arrow">→</div>
					</a>

					<!-- Server Cards -->
					{#if servers.length > 0}
						<div class="servers-section">
							<h4 class="subsection-title">Your Servers</h4>
							<div class="servers-grid">
								{#each servers as server}
									<div class="server-card">
										<div class="server-icon">🏠</div>
										<div class="server-info">
											<h5 class="server-name">{server.name}</h5>
											<p class="server-description">{server.description || 'No description'}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Channel Cards -->
					{#if channels.length > 0}
						<div class="channels-section">
							<h4 class="subsection-title">Recent Channels</h4>
							<div class="channels-grid">
								{#each channels.slice(0, 6) as channel}
									<div class="channel-card">
										<div class="channel-icon">📢</div>
										<div class="channel-info">
											<h5 class="channel-name">#{channel.name}</h5>
											<p class="channel-server">{channel.serverName}</p>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			{/if}

			{#if activeTab === 'admin' && isAdmin()}
				<div class="admin-panel">
					<!-- Server Settings -->
					<div class="section-card">
						<h3 class="section-title">Server Settings</h3>
						<div class="settings-grid">
							<div class="setting-item">
								<label>Hostname</label>
								<div class="setting-value">{settings.hostname || 'localhost'}</div>
							</div>
							<div class="setting-item">
								<label>Port</label>
								<div class="setting-value">{settings.port || '8081'}</div>
							</div>
							<div class="setting-item">
								<label>SSL Enabled</label>
								<div class="setting-value">{settings.ssl_enabled === 'true' ? 'Yes' : 'No'}</div>
							</div>
							<div class="setting-item">
								<label>External Domain</label>
								<div class="setting-value">{settings.external_domain || 'Not set'}</div>
							</div>
							<div class="setting-item">
								<label>mDNS Enabled</label>
								<div class="setting-value">{settings.mdns_enabled === 'true' ? 'Yes' : 'No'}</div>
							</div>
							<div class="setting-item">
								<label>Auth Mode</label>
								<div class="setting-value">{settings.auth_mode?.replace('_', ' ') || 'public'}</div>
							</div>
						</div>
					</div>

					<!-- Create Server -->
					<div class="section-card">
						<div class="card-header">
							<h3 class="section-title">Create New Server</h3>
							<button class="create-btn" on:click={() => showCreateModal = true}>
								➕ Create Server
							</button>
						</div>
					</div>

					<!-- Create Channel -->
					<div class="section-card">
						<div class="card-header">
							<h3 class="section-title">Create New Channel</h3>
							<button class="create-btn" on:click={() => showCreateModal = true}>
								➕ Create Channel
							</button>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}

<!-- Create Modal -->
{#if showCreateModal}
	<div class="modal-overlay" on:click={() => showCreateModal = false}>
		<div class="modal-content" on:click|stopPropagation>
			<h3>Create New</h3>
			<form on:submit|preventDefault={createServer}>
				<div class="form-group">
					<label for="name">Name</label>
					<input id="name" type="text" bind:value={newServer.name} required />
				</div>
				<div class="form-group">
					<label for="description">Description</label>
					<textarea id="description" bind:value={newServer.description}></textarea>
				</div>
				<div class="modal-actions">
					<button type="button" class="secondary-btn" on:click={() => showCreateModal = false}>
						Cancel
					</button>
					<button type="submit" class="primary-btn">
						Create
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<style>
	.dashboard-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.dashboard-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding: 1.5rem;
		background: var(--color-glass);
		border-radius: var(--border-radius-lg);
		border: 1px solid var(--color-glass-border);
		backdrop-filter: blur(16px);
	}

	.welcome-text {
		color: var(--color-accent);
		margin: 0 0 0.5rem 0;
		font-size: 1.8rem;
		font-weight: 700;
	}

	.user-badge {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.role-badge {
		padding: 0.25rem 0.75rem;
		border-radius: var(--border-radius);
		font-size: 0.8rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.role-badge.super_admin {
		background: linear-gradient(135deg, #ff6b6b, #ee5a24);
		color: white;
	}

	.role-badge.admin {
		background: linear-gradient(135deg, #4ecdc4, #44a08d);
		color: white;
	}

	.role-badge.user {
		background: linear-gradient(135deg, #a8edea, #fed6e3);
		color: #333;
	}

	.user-id {
		color: var(--color-text);
		opacity: 0.7;
		font-size: 0.9rem;
	}

	.logout-btn {
		background: linear-gradient(135deg, #ff6b6b, #ee5a24);
		color: white;
		border: none;
		border-radius: var(--border-radius);
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.logout-btn:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}

	.tab-navigation {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 2rem;
		padding: 0.5rem;
		background: var(--color-glass);
		border-radius: var(--border-radius-lg);
		border: 1px solid var(--color-glass-border);
	}

	.tab-btn {
		flex: 1;
		padding: 1rem 1.5rem;
		background: transparent;
		border: none;
		border-radius: var(--border-radius);
		color: var(--color-text);
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.tab-btn.active {
		background: var(--color-accent);
		color: white;
		box-shadow: var(--shadow-md);
	}

	.tab-btn:hover:not(.active) {
		background: rgba(255, 255, 255, 0.1);
	}

	.overview-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.stats-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background: var(--color-glass);
		border-radius: var(--border-radius-lg);
		border: 1px solid var(--color-glass-border);
		backdrop-filter: blur(16px);
		transition: all 0.3s ease;
	}

	.stats-card:hover {
		transform: translateY(-4px);
		box-shadow: var(--shadow-xl);
	}

	.stats-icon {
		font-size: 2rem;
		width: 60px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
		border-radius: var(--border-radius-lg);
		color: white;
	}

	.stats-number {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-accent);
		line-height: 1;
	}

	.stats-label {
		color: var(--color-text);
		opacity: 0.8;
		font-size: 0.9rem;
	}

	.section-card {
		background: var(--color-glass);
		border-radius: var(--border-radius-lg);
		border: 1px solid var(--color-glass-border);
		padding: 2rem;
		margin-bottom: 2rem;
		backdrop-filter: blur(16px);
	}

	.section-title {
		color: var(--color-accent);
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.nav-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1.5rem;
		background: var(--color-glass);
		border-radius: var(--border-radius-lg);
		border: 1px solid var(--color-glass-border);
		text-decoration: none;
		color: var(--color-text);
		transition: all 0.3s ease;
		margin-bottom: 1rem;
	}

	.nav-card:hover {
		transform: translateY(-4px);
		box-shadow: var(--shadow-xl);
		border-color: var(--color-accent);
	}

	.nav-card.primary-card {
		background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
		color: white;
		border-color: var(--color-accent);
	}

	.card-icon {
		font-size: 2rem;
		width: 60px;
		height: 60px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgba(255, 255, 255, 0.2);
		border-radius: var(--border-radius-lg);
	}

	.card-content {
		flex: 1;
	}

	.card-title {
		margin: 0 0 0.5rem 0;
		font-size: 1.2rem;
		font-weight: 600;
	}

	.card-description {
		margin: 0;
		opacity: 0.8;
		font-size: 0.9rem;
	}

	.card-arrow {
		font-size: 1.5rem;
		font-weight: 700;
		opacity: 0.7;
	}

	.servers-grid, .channels-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.server-card, .channel-card {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: var(--border-radius);
		border: 1px solid var(--color-glass-border);
		transition: all 0.3s ease;
	}

	.server-card:hover, .channel-card:hover {
		background: rgba(255, 255, 255, 0.1);
		transform: translateY(-2px);
	}

	.server-icon, .channel-icon {
		font-size: 1.5rem;
		width: 40px;
		height: 40px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-accent);
		border-radius: var(--border-radius);
		color: white;
	}

	.server-name, .channel-name {
		margin: 0 0 0.25rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.server-description, .channel-server {
		margin: 0;
		font-size: 0.85rem;
		opacity: 0.7;
	}

	.subsection-title {
		color: var(--color-accent);
		margin: 2rem 0 1rem 0;
		font-size: 1.2rem;
		font-weight: 600;
	}

	.settings-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.setting-item {
		padding: 1rem;
		background: rgba(255, 255, 255, 0.05);
		border-radius: var(--border-radius);
		border: 1px solid var(--color-glass-border);
	}

	.setting-item label {
		display: block;
		color: var(--color-text);
		opacity: 0.7;
		font-size: 0.9rem;
		margin-bottom: 0.5rem;
	}

	.setting-value {
		color: var(--color-accent);
		font-weight: 600;
		font-size: 1rem;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.create-btn {
		background: linear-gradient(135deg, var(--color-success), #059669);
		color: white;
		border: none;
		border-radius: var(--border-radius);
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
	}

	.create-btn:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}

	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(8px);
	}

	.modal-content {
		background: var(--color-glass);
		border-radius: var(--border-radius-lg);
		border: 1px solid var(--color-glass-border);
		padding: 2rem;
		max-width: 500px;
		width: 90%;
		backdrop-filter: blur(16px);
	}

	.modal-content h3 {
		color: var(--color-accent);
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		font-weight: 600;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		color: var(--color-text);
		margin-bottom: 0.5rem;
		font-weight: 500;
	}

	.form-group input, .form-group textarea {
		width: 100%;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid var(--color-glass-border);
		border-radius: var(--border-radius);
		color: var(--color-text);
		font-size: 1rem;
		box-sizing: border-box;
	}

	.form-group textarea {
		resize: vertical;
		min-height: 100px;
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 2rem;
	}

	.primary-btn, .secondary-btn {
		padding: 0.75rem 1.5rem;
		border-radius: var(--border-radius);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.3s ease;
		border: none;
	}

	.primary-btn {
		background: var(--color-accent);
		color: white;
	}

	.secondary-btn {
		background: transparent;
		color: var(--color-text);
		border: 1px solid var(--color-glass-border);
	}

	.primary-btn:hover, .secondary-btn:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
	}

	.loading-container {
		text-align: center;
		padding: 3rem;
	}

	.loading-text {
		font-size: 1.2rem;
		margin-bottom: 1rem;
		color: var(--color-text);
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 3px solid var(--color-glass-border);
		border-top: 3px solid var(--color-accent);
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin: 0 auto;
	}

	.error-message {
		color: var(--color-error);
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--border-radius);
		padding: 1rem;
		margin-bottom: 1rem;
		text-align: center;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	@media (max-width: 768px) {
		.dashboard-container {
			padding: 1rem;
		}

		.dashboard-header {
			flex-direction: column;
			gap: 1rem;
			text-align: center;
		}

		.tab-navigation {
			flex-direction: column;
		}

		.overview-grid {
			grid-template-columns: 1fr;
		}

		.servers-grid, .channels-grid {
			grid-template-columns: 1fr;
		}
	}
</style> 