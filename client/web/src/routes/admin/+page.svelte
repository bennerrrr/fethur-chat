<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { apiClient } from '$lib/api/client';
	import { goto } from '$app/navigation';
	import type { User } from '$lib/types';

	let currentUser: User | null = null;
	let users: User[] = [];
	let onlineUsers: any[] = [];
	let systemHealth: any = null;
	let metrics: any = null;
	let auditLogs: any[] = [];
	let userLatency: any[] = [];
	let servers: any[] = [];
	
	let activeTab = 'users';
	let isLoading = false;
	let error = '';
	
	// User management
	let showCreateUserModal = false;
	let showEditUserModal = false;
	let selectedUser: User | null = null;
	let newUser = { username: '', email: '', password: '', role: 'user' };
	let editUser = { username: '', email: '', password: '' };
	
	// Moderation
	let showModerationModal = false;
	let moderationAction = '';
	let moderationReason = '';
	let moderationDuration = 0;
	
	// Server management
	let showCreateServerModal = false;
	let newServer = { name: '', description: '' };
	
	onMount(async () => {
		if (!browser) return;
		
		const token = localStorage.getItem('token');
		console.log('Admin page - Token:', token ? 'Present' : 'Missing');
		
		if (!token) {
			goto('/');
			return;
		}
		
		apiClient.setToken(token);
		
		try {
			// Check if user is admin
			currentUser = await apiClient.getCurrentUser();
			console.log('Admin page - Current user:', currentUser);
			
			if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
				console.log('Admin page - Access denied, role:', currentUser?.role);
				error = 'Access denied. Admin privileges required.';
				return;
			}
			
			console.log('Admin page - Loading data...');
			await loadData();
		} catch (err: any) {
			console.error('Admin page error:', err);
			error = err.message || 'Failed to load admin data';
		}
	});
	
	async function loadData() {
		isLoading = true;
		error = '';
		
		try {
			// Load data with individual error handling
			const promises = [
				loadUsers().catch(err => console.error('Failed to load users:', err)),
				loadSystemHealth().catch(err => console.error('Failed to load health:', err)),
				loadMetrics().catch(err => console.error('Failed to load metrics:', err)),
				loadOnlineUsers().catch(err => console.error('Failed to load online users:', err)),
				loadAuditLogs().catch(err => console.error('Failed to load audit logs:', err)),
				loadUserLatency().catch(err => console.error('Failed to load user latency:', err)),
				loadServers().catch(err => console.error('Failed to load servers:', err))
			];
			
			await Promise.allSettled(promises);
		} catch (err: any) {
			console.error('Load data error:', err);
			error = err.message || 'Failed to load data';
		} finally {
			isLoading = false;
		}
	}
	
	async function loadUsers() {
		users = await apiClient.getUsers();
	}
	
	async function loadSystemHealth() {
		systemHealth = await apiClient.getAdminHealth();
	}
	
	async function loadMetrics() {
		metrics = await apiClient.getMetrics();
	}
	
	async function loadOnlineUsers() {
		onlineUsers = await apiClient.getOnlineUsers();
	}
	
	async function loadAuditLogs() {
		auditLogs = await apiClient.getAuditLogs();
	}
	
	async function loadUserLatency() {
		userLatency = await apiClient.getUserLatency();
	}

	async function loadServers() {
		servers = await apiClient.getServers();
	}

	async function createServer() {
		try {
			await apiClient.createServer(newServer);
			showCreateServerModal = false;
			newServer = { name: '', description: '' };
			await loadServers();
		} catch (err: any) {
			console.error('Failed to create server:', err);
		}
	}

	function editServer(server: any) {
		// TODO: Implement server editing
		console.log('Edit server:', server);
	}

	async function deleteServer(serverId: number) {
		if (confirm('Are you sure you want to delete this server?')) {
			try {
				// TODO: Implement server deletion API
				console.log('Delete server:', serverId);
				await loadServers();
			} catch (err: any) {
				console.error('Failed to delete server:', err);
			}
		}
	}
	
	async function createUser() {
		try {
			await apiClient.createUser(newUser);
			showCreateUserModal = false;
			newUser = { username: '', email: '', password: '', role: 'user' };
			await loadUsers();
		} catch (err: any) {
			console.error('Failed to create user:', err);
		}
	}
	
	function openEditUserModal(user: User) {
		selectedUser = user;
		editUser = { username: user.username, email: user.email || '', password: '' };
		showEditUserModal = true;
	}
	
	async function updateUser() {
		if (!selectedUser) return;
		
		try {
			await apiClient.updateUser(selectedUser.id, editUser);
			showEditUserModal = false;
			selectedUser = null;
			await loadUsers();
		} catch (err: any) {
			console.error('Failed to update user:', err);
		}
	}
	
	async function deleteUser(user: User) {
		if (confirm(`Are you sure you want to delete user ${user.username}?`)) {
			try {
				await apiClient.deleteUser(user.id);
				await loadUsers();
			} catch (err: any) {
				console.error('Failed to delete user:', err);
			}
		}
	}
	
	async function updateUserRole(user: User, role: string) {
		try {
			await apiClient.updateUserRole(user.id, role);
			await loadUsers();
		} catch (err: any) {
			console.error('Failed to update user role:', err);
		}
	}
	
	function openModerationModal(user: any, action: string) {
		selectedUser = user;
		moderationAction = action;
		moderationReason = '';
		moderationDuration = 0;
		showModerationModal = true;
	}
	
	async function performModeration() {
		if (!selectedUser) return;
		
		try {
			switch (moderationAction) {
				case 'kick':
					await apiClient.kickUser(selectedUser.id, moderationReason);
					break;
				case 'ban':
					await apiClient.banUser(selectedUser.id, moderationReason, moderationDuration);
					break;
				case 'mute':
					await apiClient.muteUser(selectedUser.id, moderationReason, moderationDuration);
					break;
				case 'unban':
					await apiClient.unbanUser(selectedUser.id);
					break;
				case 'unmute':
					await apiClient.unmuteUser(selectedUser.id);
					break;
			}
			
			showModerationModal = false;
			selectedUser = null;
			await loadOnlineUsers();
		} catch (err: any) {
			console.error('Failed to perform moderation:', err);
		}
	}
	
	function getRoleBadgeColor(role: string) {
		switch (role) {
			case 'super_admin': return 'badge-red';
			case 'admin': return 'badge-blue';
			default: return 'badge-gray';
		}
	}
	
	function getStatusBadgeColor(isOnline: boolean) {
		return isOnline ? 'badge-green' : 'badge-gray';
	}
</script>

<svelte:head>
	<title>Admin Dashboard - Fethur</title>
</svelte:head>

<div class="admin-page">
	<div class="admin-header">
		<h1>Admin Dashboard</h1>
		<p>Welcome, {currentUser?.username} ({currentUser?.role})</p>
	</div>

	{#if error}
		<div class="error-message">
			<div class="error-content">
				<p>{error}</p>
				<button class="retry-button" on:click={loadData}>
					🔄 Retry
				</button>
			</div>
		</div>
	{/if}

	<div class="admin-tabs">
		<button 
			class="tab-button {activeTab === 'users' ? 'active' : ''}"
			on:click={() => activeTab = 'users'}
		>
			User Management
		</button>
		<button 
			class="tab-button {activeTab === 'moderation' ? 'active' : ''}"
			on:click={() => activeTab = 'moderation'}
		>
			Moderation
		</button>
		<button 
			class="tab-button {activeTab === 'health' ? 'active' : ''}"
			on:click={() => activeTab = 'health'}
		>
			System Health
		</button>
		<button 
			class="tab-button {activeTab === 'metrics' ? 'active' : ''}" 
			on:click={() => activeTab = 'metrics'}
		>
			Metrics
		</button>
		<button 
			class="tab-button {activeTab === 'logs' ? 'active' : ''}"
			on:click={() => activeTab = 'logs'}
		>
			Audit Logs
		</button>
		<button 
			class="tab-button {activeTab === 'servers' ? 'active' : ''}"
			on:click={() => activeTab = 'servers'}
		>
			Servers
		</button>
	</div>

	{#if isLoading}
		<div class="loading">
			Loading...
		</div>
	{:else}
		{#if activeTab === 'users'}
			<div class="users-section">
				<div class="section-header">
					<h2>User Management</h2>
					<button class="btn-primary" on:click={() => showCreateUserModal = true}>
						Create User
					</button>
				</div>

				<div class="users-table">
					<table>
						<thead>
							<tr>
								<th>ID</th>
								<th>Username</th>
								<th>Email</th>
								<th>Role</th>
								<th>Status</th>
								<th>Messages</th>
								<th>Servers</th>
								<th>Created</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody>
							{#each users as user}
								<tr>
									<td>{user.id}</td>
									<td>{user.username}</td>
									<td>{user.email}</td>
									<td>
										<span class="badge {getRoleBadgeColor(user.role || 'user')}">
											{user.role || 'user'}
										</span>
									</td>
									<td>
										<span class="badge {getStatusBadgeColor(user.isOnline)}">
											{user.isOnline ? 'Online' : 'Offline'}
										</span>
									</td>
									<td>{user.messageCount || 0}</td>
									<td>{user.serverCount || 0}</td>
									<td>{user.createdAt.toLocaleDateString()}</td>
									<td>
										<div class="action-buttons">
											<button class="btn-small" on:click={() => openEditUserModal(user)}>
												Edit
											</button>
											<button class="btn-small btn-danger" on:click={() => deleteUser(user)}>
												Delete
											</button>
											<select on:change={(e) => updateUserRole(user, (e.target as HTMLSelectElement).value)} value={user.role || 'user'}>
												<option value="user">User</option>
												<option value="admin">Admin</option>
												<option value="super_admin">Super Admin</option>
											</select>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else if activeTab === 'moderation'}
			<div class="moderation-section">
				<div class="section-header">
					<h2>Moderation Tools</h2>
				</div>

				<div class="online-users">
					<h3>Online Users</h3>
					<div class="users-grid">
						{#each onlineUsers as user}
							<div class="user-card">
								<div class="user-info">
									<h4>{user.username}</h4>
									<p>IP: {user.ip}</p>
									<p>Connected: {new Date(user.connected_at).toLocaleString()}</p>
								</div>
								<div class="moderation-actions">
									<button class="btn-small" on:click={() => openModerationModal(user, 'kick')}>
										Kick
									</button>
									<button class="btn-small btn-warning" on:click={() => openModerationModal(user, 'ban')}>
										Ban
									</button>
									<button class="btn-small btn-warning" on:click={() => openModerationModal(user, 'mute')}>
										Mute
									</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			</div>
		{:else if activeTab === 'health'}
			<div class="health-section">
				<div class="section-header">
					<h2>System Health</h2>
					<button class="btn-secondary" on:click={loadSystemHealth}>
						Refresh
					</button>
				</div>

				{#if systemHealth}
					<div class="health-grid">
						<div class="health-card">
							<h3>Database</h3>
							<p class="status {systemHealth.database?.status === 'healthy' ? 'healthy' : 'unhealthy'}">
								{systemHealth.database?.status || 'Unknown'}
							</p>
							<p>Connection: {systemHealth.database?.connection || 'Unknown'}</p>
						</div>

						<div class="health-card">
							<h3>WebSocket</h3>
							<p class="status {systemHealth.websocket?.status === 'healthy' ? 'healthy' : 'unhealthy'}">
								{systemHealth.websocket?.status || 'Unknown'}
							</p>
							<p>Connections: {systemHealth.websocket?.connections || 0}</p>
						</div>

						<div class="health-card">
							<h3>API</h3>
							<p class="status {systemHealth.api?.status === 'healthy' ? 'healthy' : 'unhealthy'}">
								{systemHealth.api?.status || 'Unknown'}
							</p>
							<p>Uptime: {systemHealth.api?.uptime || 'Unknown'}</p>
						</div>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'metrics'}
			<div class="metrics-section">
				<div class="section-header">
					<h2>System Metrics</h2>
					<button class="btn-secondary" on:click={loadMetrics}>
						Refresh
					</button>
				</div>

				{#if metrics}
					<div class="metrics-grid">
						<div class="metric-card">
							<h3>User Activity (24h)</h3>
							<p>Active Users: {metrics.user_activity?.active_users_24h}</p>
							<p>New Users: {metrics.user_activity?.new_users_today}</p>
							<p>Messages: {metrics.user_activity?.messages_today}</p>
						</div>

						<div class="metric-card">
							<h3>Role Distribution</h3>
							{#each Object.entries(metrics.role_distribution || {}) as [role, count]}
								<p>{role}: {count}</p>
							{/each}
						</div>

						<div class="metric-card">
							<h3>Online Users</h3>
							<p>Currently Online: {metrics.online_users}</p>
						</div>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'logs'}
			<div class="logs-section">
				<div class="section-header">
					<h2>Audit Logs</h2>
					<button class="btn-secondary" on:click={loadAuditLogs}>
						Refresh
					</button>
				</div>

				<div class="logs-table">
					<table>
						<thead>
							<tr>
								<th>Time</th>
								<th>Admin</th>
								<th>Action</th>
								<th>Details</th>
							</tr>
						</thead>
						<tbody>
							{#each auditLogs as log}
								<tr>
									<td>{new Date(log.created_at).toLocaleString()}</td>
									<td>{log.admin_username}</td>
									<td>{log.action}</td>
									<td>{log.details}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{:else if activeTab === 'servers'}
			<div class="servers-section">
				<div class="section-header">
					<h2>Server Management</h2>
					<button class="btn-primary" on:click={() => showCreateServerModal = true}>
						Create Server
					</button>
				</div>

				<div class="servers-grid">
					{#each servers as server}
						<div class="server-card">
							<h3>{server.name}</h3>
							<p>{server.description || 'No description'}</p>
							<div class="server-stats">
								<span>Channels: {server.channels?.length || 0}</span>
								<span>Members: {server.members?.length || 0}</span>
							</div>
							<div class="server-actions">
								<button class="btn-secondary" on:click={() => editServer(server)}>
									Edit
								</button>
								<button class="btn-danger" on:click={() => deleteServer(server.id)}>
									Delete
								</button>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	<!-- Create User Modal -->
	{#if showCreateUserModal}
		<div class="modal-overlay" on:click={() => showCreateUserModal = false}>
			<div class="modal" on:click|stopPropagation>
				<h2>Create User</h2>
				<form on:submit|preventDefault={createUser}>
					<div class="form-group">
						<label for="username">Username</label>
						<input type="text" id="username" bind:value={newUser.username} required />
					</div>
					<div class="form-group">
						<label for="email">Email</label>
						<input type="email" id="email" bind:value={newUser.email} />
					</div>
					<div class="form-group">
						<label for="password">Password</label>
						<input type="password" id="password" bind:value={newUser.password} required />
					</div>
					<div class="form-group">
						<label for="role">Role</label>
						<select id="role" bind:value={newUser.role}>
							<option value="user">User</option>
							<option value="admin">Admin</option>
							<option value="super_admin">Super Admin</option>
						</select>
					</div>
					<div class="modal-actions">
						<button type="button" class="btn-secondary" on:click={() => showCreateUserModal = false}>
							Cancel
						</button>
						<button type="submit" class="btn-primary">
							Create User
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Edit User Modal -->
	{#if showEditUserModal}
		<div class="modal-overlay" on:click={() => showEditUserModal = false}>
			<div class="modal" on:click|stopPropagation>
				<h2>Edit User</h2>
				<form on:submit|preventDefault={updateUser}>
					<div class="form-group">
						<label for="edit-username">Username</label>
						<input type="text" id="edit-username" bind:value={editUser.username} required />
					</div>
					<div class="form-group">
						<label for="edit-email">Email</label>
						<input type="email" id="edit-email" bind:value={editUser.email} />
					</div>
					<div class="form-group">
						<label for="edit-password">Password (leave blank to keep current)</label>
						<input type="password" id="edit-password" bind:value={editUser.password} />
					</div>
					<div class="modal-actions">
						<button type="button" class="btn-secondary" on:click={() => showEditUserModal = false}>
							Cancel
						</button>
						<button type="submit" class="btn-primary">
							Update User
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}

	<!-- Moderation Modal -->
	{#if showModerationModal}
		<div class="modal-overlay" on:click={() => showModerationModal = false}>
			<div class="modal" on:click|stopPropagation>
				<h2>{moderationAction.charAt(0).toUpperCase() + moderationAction.slice(1)} User</h2>
				<p>User: {selectedUser?.username}</p>
				
				{#if moderationAction !== 'unban' && moderationAction !== 'unmute'}
					<div class="form-group">
						<label for="reason">Reason</label>
						<input type="text" id="reason" bind:value={moderationReason} />
					</div>
					
					{#if moderationAction === 'ban' || moderationAction === 'mute'}
						<div class="form-group">
							<label for="duration">Duration ({moderationAction === 'ban' ? 'hours' : 'minutes'}) (0 for permanent)</label>
							<input type="number" id="duration" bind:value={moderationDuration} min="0" />
						</div>
					{/if}
				{/if}
				
				<div class="modal-actions">
					<button type="button" class="btn-secondary" on:click={() => showModerationModal = false}>
						Cancel
					</button>
					<button type="button" class="btn-primary" on:click={performModeration}>
						{moderationAction.charAt(0).toUpperCase() + moderationAction.slice(1)}
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Create Server Modal -->
	{#if showCreateServerModal}
		<div class="modal-overlay" on:click={() => showCreateServerModal = false}>
			<div class="modal" on:click|stopPropagation>
				<h2>Create Server</h2>
				<form on:submit|preventDefault={createServer}>
					<div class="form-group">
						<label for="server-name">Server Name</label>
						<input type="text" id="server-name" bind:value={newServer.name} required />
					</div>
					<div class="form-group">
						<label for="server-description">Description</label>
						<textarea id="server-description" bind:value={newServer.description} rows="3"></textarea>
					</div>
					<div class="modal-actions">
						<button type="button" class="btn-secondary" on:click={() => showCreateServerModal = false}>
							Cancel
						</button>
						<button type="submit" class="btn-primary">
							Create Server
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

<style>
	.admin-page {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
		background: var(--color-bg);
		color: var(--color-text);
		min-height: 100vh;
	}

	.admin-header {
		margin-bottom: 2rem;
		text-align: center;
	}

	.admin-header h1 {
		font-size: var(--font-size-3xl);
		margin-bottom: 0.5rem;
		color: #ffffff;
		font-weight: 600;
	}

	.admin-header p {
		color: var(--color-text-muted);
		font-size: var(--font-size-lg);
	}

	.error-message {
		background: rgba(239, 68, 68, 0.1);
		color: var(--color-error);
		padding: 1rem;
		border-radius: var(--radius-md);
		margin-bottom: 1rem;
		border: 1px solid var(--color-error);
	}

	.error-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}

	.error-content p {
		margin: 0;
		flex: 1;
	}

	.retry-button {
		background: var(--color-error);
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: var(--font-size-sm);
		transition: background-color 0.2s;
	}

	.retry-button:hover {
		background: #dc2626;
	}

	.admin-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 2rem;
		border-bottom: 2px solid var(--color-border);
	}

	.tab-button {
		padding: 0.75rem 1.5rem;
		border: none;
		background: none;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
		color: var(--color-text-muted);
		font-weight: 500;
	}

	.tab-button:hover {
		background: var(--color-surface);
		color: var(--color-text);
	}

	.tab-button.active {
		border-bottom-color: var(--color-accent);
		color: var(--color-accent);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.section-header h2 {
		margin: 0;
		color: #ffffff;
		font-size: var(--font-size-xl);
		font-weight: 600;
	}

	.loading {
		text-align: center;
		padding: 2rem;
		font-size: var(--font-size-lg);
		color: var(--color-text-muted);
	}

	/* Tables */
	.users-table, .logs-table {
		background: var(--color-surface);
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--color-border);
	}

	table {
		width: 100%;
		border-collapse: collapse;
	}

	th, td {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid var(--color-border);
		color: var(--color-text);
	}

	th {
		background: var(--color-primary);
		font-weight: 600;
		color: var(--color-text);
	}

	.badge {
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		font-size: var(--font-size-xs);
		font-weight: 500;
	}

	.badge-red {
		background: rgba(239, 68, 68, 0.2);
		color: #fca5a5;
	}

	.badge-blue {
		background: rgba(59, 130, 246, 0.2);
		color: #93c5fd;
	}

	.badge-green {
		background: rgba(16, 185, 129, 0.2);
		color: #6ee7b7;
	}

	.badge-gray {
		background: rgba(107, 114, 128, 0.2);
		color: #d1d5db;
	}

	.action-buttons {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.btn-small {
		padding: 0.25rem 0.5rem;
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		font-size: var(--font-size-xs);
		background: var(--color-accent);
		color: white;
		transition: background-color 0.2s;
	}

	.btn-small:hover {
		background: var(--color-accent-hover);
	}

	.btn-small.btn-danger {
		background: var(--color-error);
	}

	.btn-small.btn-danger:hover {
		background: #dc2626;
	}

	.btn-small.btn-warning {
		background: var(--color-warning);
	}

	.btn-small.btn-warning:hover {
		background: #d97706;
	}

	/* User Grid */
	.users-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.user-card {
		background: var(--color-surface);
		padding: 1rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
	}

	.user-info h4 {
		margin: 0 0 0.5rem 0;
		color: var(--color-text);
	}

	.user-info p {
		margin: 0.25rem 0;
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}

	.moderation-actions {
		display: flex;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	/* Health and Metrics */
	.health-grid, .metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.health-card, .metric-card {
		background: var(--color-surface);
		padding: 1.5rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
	}

	.health-card h3, .metric-card h3 {
		margin: 0 0 1rem 0;
		color: var(--color-text);
	}

	.health-card p, .metric-card p {
		margin: 0.5rem 0;
		color: var(--color-text-muted);
	}

	.status {
		font-weight: 600;
	}

	.status.healthy {
		color: var(--color-success);
	}

	.status.unhealthy {
		color: var(--color-error);
	}

	/* Servers */
	.servers-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.server-card {
		background: var(--color-surface);
		padding: 1.5rem;
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
	}

	.server-card h3 {
		margin: 0 0 0.5rem 0;
		color: var(--color-text);
	}

	.server-card p {
		margin: 0 0 1rem 0;
		color: var(--color-text-muted);
	}

	.server-stats {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.server-actions {
		display: flex;
		gap: 0.5rem;
	}

	/* Buttons */
	.btn-primary, .btn-secondary, .btn-danger {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: var(--radius-md);
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
	}

	.btn-primary {
		background: var(--color-accent);
		color: white;
	}

	.btn-primary:hover {
		background: var(--color-accent-hover);
	}

	.btn-secondary {
		background: var(--color-primary);
		color: var(--color-text);
	}

	.btn-secondary:hover {
		background: var(--color-surface);
	}

	.btn-danger {
		background: var(--color-error);
		color: white;
	}

	.btn-danger:hover {
		background: #dc2626;
	}

	/* Modals */
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
	}

	.modal {
		background: var(--color-surface);
		padding: 2rem;
		border-radius: var(--radius-lg);
		max-width: 500px;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;
		border: 1px solid var(--color-border);
	}

	.modal h2 {
		margin: 0 0 1.5rem 0;
		color: var(--color-text);
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: var(--color-text);
	}

	.form-group input, .form-group select, .form-group textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-base);
		background: var(--color-primary);
		color: var(--color-text);
	}

	.form-group input:focus, .form-group select:focus, .form-group textarea:focus {
		outline: none;
		border-color: var(--color-accent);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 2rem;
	}
</style> 