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
	
	onMount(async () => {
		if (!browser) return;
		
		const token = localStorage.getItem('token');
		if (!token) {
			goto('/');
			return;
		}
		
		apiClient.setToken(token);
		
		try {
			// Check if user is admin
			currentUser = await apiClient.getCurrentUser();
			console.log('Current user:', currentUser); // Debug log
			
			if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'super_admin')) {
				error = 'Access denied. Admin privileges required.';
				return;
			}
			
			await loadData();
		} catch (err: any) {
			console.error('Admin page error:', err); // Debug log
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
				loadUserLatency().catch(err => console.error('Failed to load user latency:', err))
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
		auditLogs = await apiClient.getAuditLogs(20, 0);
	}
	
	async function loadUserLatency() {
		userLatency = await apiClient.getUserLatency();
	}
	
	async function createUser() {
		try {
			await apiClient.createUser(newUser);
			showCreateUserModal = false;
			newUser = { username: '', email: '', password: '', role: 'user' };
			await loadUsers();
		} catch (err: any) {
			error = err.message || 'Failed to create user';
		}
	}
	
	async function updateUser() {
		if (!selectedUser) return;
		
		try {
			await apiClient.updateUser(selectedUser.id, editUser);
			showEditUserModal = false;
			selectedUser = null;
			await loadUsers();
		} catch (err: any) {
			error = err.message || 'Failed to update user';
		}
	}
	
	async function deleteUser(user: User) {
		if (!confirm(`Are you sure you want to delete user "${user.username}"?`)) return;
		
		try {
			await apiClient.deleteUser(user.id);
			await loadUsers();
		} catch (err: any) {
			error = err.message || 'Failed to delete user';
		}
	}
	
	async function updateUserRole(user: User, role: string) {
		try {
			await apiClient.updateUserRole(user.id, role);
			await loadUsers();
		} catch (err: any) {
			error = err.message || 'Failed to update user role';
		}
	}
	
	function openModerationModal(user: User, action: string) {
		selectedUser = user;
		moderationAction = action;
		moderationReason = '';
		moderationDuration = 0;
		showModerationModal = true;
	}
	
	async function performModerationAction() {
		if (!selectedUser) return;
		
		try {
			switch (moderationAction) {
				case 'kick':
					await apiClient.kickUser(selectedUser.id, moderationReason);
					break;
				case 'ban':
					await apiClient.banUser(selectedUser.id, moderationReason, moderationDuration);
					break;
				case 'unban':
					await apiClient.unbanUser(selectedUser.id);
					break;
				case 'mute':
					await apiClient.muteUser(selectedUser.id, moderationReason, moderationDuration);
					break;
				case 'unmute':
					await apiClient.unmuteUser(selectedUser.id);
					break;
			}
			
			showModerationModal = false;
			selectedUser = null;
			await loadUsers();
		} catch (err: any) {
			error = err.message || 'Failed to perform moderation action';
		}
	}
	
	function openEditUserModal(user: User) {
		selectedUser = user;
		editUser = {
			username: user.username,
			email: user.email,
			password: ''
		};
		showEditUserModal = true;
	}
	
	function getRoleBadgeColor(role: string) {
		switch (role) {
			case 'super_admin': return 'bg-red-500';
			case 'admin': return 'bg-orange-500';
			case 'user': return 'bg-blue-500';
			default: return 'bg-gray-500';
		}
	}
	
	function getStatusBadgeColor(isOnline: boolean) {
		return isOnline ? 'bg-green-500' : 'bg-gray-500';
	}
</script>

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
							<p>Status: <span class="status {systemHealth.database?.status}">{systemHealth.database?.status}</span></p>
							<p>Type: {systemHealth.database?.type}</p>
						</div>

						<div class="health-card">
							<h3>WebSocket</h3>
							<p>Status: <span class="status {systemHealth.websocket?.status}">{systemHealth.websocket?.status}</span></p>
							<p>Connections: {systemHealth.websocket?.connections}</p>
						</div>

						<div class="health-card">
							<h3>Statistics</h3>
							<p>Total Users: {systemHealth.statistics?.total_users}</p>
							<p>Online Users: {systemHealth.statistics?.online_users}</p>
							<p>Total Messages: {systemHealth.statistics?.total_messages}</p>
							<p>Total Servers: {systemHealth.statistics?.total_servers}</p>
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
					<button type="button" class="btn-danger" on:click={performModerationAction}>
						{moderationAction.charAt(0).toUpperCase() + moderationAction.slice(1)}
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.admin-page {
		padding: 2rem;
		max-width: 1400px;
		margin: 0 auto;
	}

	.admin-header {
		margin-bottom: 2rem;
		text-align: center;
	}

	.admin-header h1 {
		font-size: 2.5rem;
		margin-bottom: 0.5rem;
		color: #333;
	}

	.error-message {
		background: #fee;
		color: #c33;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 1rem;
		border: 1px solid #fcc;
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
		background: #dc2626;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
		transition: background-color 0.2s;
	}

	.retry-button:hover {
		background: #b91c1c;
	}

	.admin-tabs {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 2rem;
		border-bottom: 2px solid #e5e7eb;
	}

	.tab-button {
		padding: 0.75rem 1.5rem;
		border: none;
		background: none;
		cursor: pointer;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
	}

	.tab-button:hover {
		background: #f3f4f6;
	}

	.tab-button.active {
		border-bottom-color: #3b82f6;
		color: #3b82f6;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1.5rem;
	}

	.section-header h2 {
		margin: 0;
		color: #333;
	}

	.loading {
		text-align: center;
		padding: 2rem;
		font-size: 1.2rem;
		color: #666;
	}

	/* Tables */
	.users-table, .logs-table {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		background: white;
		border-radius: 8px;
		overflow: hidden;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	th, td {
		padding: 0.75rem;
		text-align: left;
		border-bottom: 1px solid #e5e7eb;
	}

	th {
		background: #f9fafb;
		font-weight: 600;
		color: #374151;
	}

	/* Badges */
	.badge {
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		color: white;
		font-size: 0.75rem;
		font-weight: 500;
	}

	/* Action buttons */
	.action-buttons {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.btn-small {
		padding: 0.25rem 0.5rem;
		font-size: 0.75rem;
		border: none;
		border-radius: 4px;
		cursor: pointer;
		background: #3b82f6;
		color: white;
	}

	.btn-small:hover {
		background: #2563eb;
	}

	.btn-small.btn-danger {
		background: #ef4444;
	}

	.btn-small.btn-danger:hover {
		background: #dc2626;
	}

	/* Buttons */
	.btn-primary, .btn-secondary, .btn-danger {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
	}

	.btn-primary {
		background: #3b82f6;
		color: white;
	}

	.btn-primary:hover {
		background: #2563eb;
	}

	.btn-secondary {
		background: #6b7280;
		color: white;
	}

	.btn-secondary:hover {
		background: #4b5563;
	}

	.btn-danger {
		background: #ef4444;
		color: white;
	}

	.btn-danger:hover {
		background: #dc2626;
	}

	.btn-warning {
		background: #f59e0b;
		color: white;
	}

	.btn-warning:hover {
		background: #d97706;
	}

	/* Moderation section */
	.users-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.user-card {
		background: white;
		padding: 1rem;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	.user-info h4 {
		margin: 0 0 0.5rem 0;
		color: #333;
	}

	.user-info p {
		margin: 0.25rem 0;
		color: #666;
		font-size: 0.875rem;
	}

	.moderation-actions {
		margin-top: 1rem;
		display: flex;
		gap: 0.5rem;
	}

	/* Health and Metrics */
	.health-grid, .metrics-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.health-card, .metric-card {
		background: white;
		padding: 1.5rem;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		border: 1px solid #e5e7eb;
	}

	.health-card h3, .metric-card h3 {
		margin: 0 0 1rem 0;
		color: #333;
	}

	.health-card p, .metric-card p {
		margin: 0.5rem 0;
		color: #666;
	}

	.status {
		font-weight: 600;
	}

	.status.healthy {
		color: #059669;
	}

	.status.unhealthy {
		color: #dc2626;
	}

	/* Modals */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal {
		background: white;
		padding: 2rem;
		border-radius: 8px;
		max-width: 500px;
		width: 90%;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal h2 {
		margin: 0 0 1.5rem 0;
		color: #333;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 500;
		color: #374151;
	}

	.form-group input, .form-group select {
		width: 100%;
		padding: 0.5rem;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		font-size: 1rem;
	}

	.form-group input:focus, .form-group select:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.modal-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 2rem;
	}
</style> 