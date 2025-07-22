<script lang="ts">
	import { Users, Circle } from 'lucide-svelte';
	import type { Server, User } from '$lib/types';
	import UserAvatar from './UserAvatar.svelte';

	export let server: Server | null = null;
	export let currentUser: User | null = null;

	// Mock data for now - this would come from the server
	let onlineUsers: User[] = [
		{ id: 1, username: 'alice', email: 'alice@example.com', isOnline: true, createdAt: new Date() },
		{ id: 2, username: 'bob', email: 'bob@example.com', isOnline: true, createdAt: new Date() },
		{ id: 3, username: 'charlie', email: 'charlie@example.com', isOnline: false, createdAt: new Date() }
	];

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