<script lang="ts">
	import { Users, Circle } from 'lucide-svelte';
	import type { Server, User } from '$lib/types';
	import UserAvatar from './UserAvatar.svelte';

	export let server: Server | null = null;
	export let currentUser: User | null = null;

	import { onMount } from 'svelte';
	import { apiClient } from '$lib/api/client';

	let onlineUsers: User[] = [];
	let isLoading = true;
	let error = '';

	onMount(async () => {
		if (server) {
			await loadServerUsers();
		}
	});

	async function loadServerUsers() {
		try {
			isLoading = true;
			// Load users for the current server
			const users = await apiClient.getUsers();
			// Filter to show only users who are members of this server
			// For now, show all users - this could be enhanced with server membership
			onlineUsers = users.map(user => ({
				...user,
				isOnline: user.isOnline || false
			}));
		} catch (err) {
			console.error('Failed to load server users:', err);
			error = 'Failed to load users';
		} finally {
			isLoading = false;
		}
	}

	$: onlineCount = onlineUsers.filter(u => u.isOnline).length;
	$: totalCount = onlineUsers.length;
</script>

<div class="user-list">
	<div class="user-list-header">
		<div class="header-info">
			<Users size={16} />
			<span>Members</span>
		</div>
		<div class="user-count">
			{onlineCount}/{totalCount}
		</div>
	</div>

	<div class="user-sections">
		{#if isLoading}
			<div class="loading-state">
				<p>Loading users...</p>
			</div>
		{:else if error}
			<div class="error-state">
				<p>{error}</p>
				<button on:click={loadServerUsers}>Retry</button>
			</div>
		{:else if onlineUsers.length === 0}
			<div class="empty-state">
				<p>No users found</p>
			</div>
		{:else}
			<!-- Online Users -->
			{#if onlineUsers.filter(u => u.isOnline).length > 0}
				<div class="user-section">
					<div class="section-header">
						<Circle size={8} class="status-indicator online" />
						<span>Online — {onlineCount}</span>
					</div>
					<div class="user-items">
						{#each onlineUsers.filter(u => u.isOnline) as user (user.id)}
							<div class="user-item">
								<UserAvatar {user} size="sm" />
								<span class="user-name">{user.username}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Offline Users -->
			{#if onlineUsers.filter(u => !u.isOnline).length > 0}
				<div class="user-section">
					<div class="section-header">
						<Circle size={8} class="status-indicator offline" />
						<span>Offline — {totalCount - onlineCount}</span>
					</div>
					<div class="user-items">
						{#each onlineUsers.filter(u => !u.isOnline) as user (user.id)}
							<div class="user-item offline">
								<UserAvatar {user} size="sm" />
								<span class="user-name">{user.username}</span>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>
</div>

<style>
	.user-list {
		width: 240px;
		background: var(--color-bg-alt);
		border-left: 1px solid var(--color-glass-border);
		display: flex;
		flex-direction: column;
		height: 100vh;
	}

	.user-list-header {
		padding: 16px;
		border-bottom: 1px solid var(--color-glass-border);
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.header-info {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--color-text);
		font-weight: 600;
		font-size: 14px;
	}

	.user-count {
		font-size: 12px;
		color: var(--color-text);
		opacity: 0.7;
	}

	.loading-state,
	.error-state,
	.empty-state {
		padding: 1rem;
		text-align: center;
		color: var(--color-text-muted);
	}

	.error-state button {
		background: var(--color-accent);
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-sm);
		cursor: pointer;
		margin-top: 0.5rem;
		font-size: var(--font-size-sm);
	}

	.error-state button:hover {
		background: var(--color-accent-hover);
	}

	.user-sections {
		flex: 1;
		overflow-y: auto;
		padding: 8px 0;
	}

	.user-section {
		margin-bottom: 16px;
	}

	.section-header {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 8px 16px;
		font-size: 12px;
		font-weight: 600;
		color: var(--color-text);
		opacity: 0.7;
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.status-indicator {
		flex-shrink: 0;
	}

	.status-indicator.online {
		color: #10b981;
	}

	.status-indicator.offline {
		color: #6b7280;
	}

	.user-items {
		display: flex;
		flex-direction: column;
	}

	.user-item {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 6px 16px;
		cursor: pointer;
		border-radius: 4px;
		margin: 0 8px;
		transition: background 0.2s ease;
	}

	.user-item:hover {
		background: var(--color-glass);
	}

	.user-item.offline {
		opacity: 0.6;
	}

	.user-name {
		font-size: 14px;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	/* Scrollbar styling */
	.user-sections::-webkit-scrollbar {
		width: 4px;
	}

	.user-sections::-webkit-scrollbar-track {
		background: transparent;
	}

	.user-sections::-webkit-scrollbar-thumb {
		background: var(--color-glass-border);
		border-radius: 2px;
	}

	.user-sections::-webkit-scrollbar-thumb:hover {
		background: var(--color-accent);
	}
</style> 