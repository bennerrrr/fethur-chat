<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Plus, Settings, Crown } from 'lucide-svelte';
	import type { Server } from '$lib/types';
	import UserAvatar from './UserAvatar.svelte';

	export let servers: Server[] = [];
	export let currentServerId: number | null = null;
	export let currentUser: any = null;



	const dispatch = createEventDispatcher<{
		selectServer: Server;
		createServer: void;
		openSettings: void;
	}>();

	function handleServerClick(server: Server) {
		dispatch('selectServer', server);
	}

	function handleCreateServer() {
		dispatch('createServer');
	}

	function handleOpenSettings() {
		dispatch('openSettings');
	}
</script>

<div class="server-list">
	<!-- Home/User section -->
	<div class="server-section">
		<div class="server-item home-item" class:active={currentServerId === null}>
			<div class="server-icon home-icon">
				<Crown size={20} />
			</div>
			<div class="server-tooltip">Home</div>
		</div>
	</div>

	<!-- Separator -->
	<div class="separator"></div>

	<!-- Servers -->
	<div class="server-section">
		{#each servers as server (server.id)}
			<div 
				class="server-item" 
				class:active={currentServerId === server.id}
				on:click={() => handleServerClick(server)}
			>
				<div class="server-icon">
					{#if server.icon}
						<img src={server.icon} alt={server.name} />
					{:else}
						{server.name.charAt(0).toUpperCase()}
					{/if}
				</div>
				<div class="server-tooltip">{server.name}</div>
			</div>
		{/each}
	</div>

	<!-- Separator -->
	<div class="separator"></div>

	<!-- Actions -->
	<div class="server-section">
		<button class="server-item action-item" on:click={handleCreateServer}>
			<div class="server-icon">
				<Plus size={20} />
			</div>
			<div class="server-tooltip">Create Server</div>
		</button>

		{#if currentUser?.role === 'super_admin' || currentUser?.role === 'admin'}
			<button class="server-item action-item" on:click={handleOpenSettings}>
				<div class="server-icon">
					<Settings size={20} />
				</div>
				<div class="server-tooltip">Server Settings</div>
			</button>
		{/if}
	</div>
</div>

<style>
	.server-list {
		width: 72px;
		background: var(--color-bg-alt);
		border-right: 1px solid var(--color-glass-border);
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 12px 0;
		gap: 8px;
		height: 100vh;
		overflow-y: auto;
	}

	.server-section {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		width: 100%;
	}

	.server-item {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		background: var(--color-glass);
		border: 1px solid var(--color-glass-border);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
		color: var(--color-text);
	}

	.server-item:hover {
		background: var(--color-accent);
		color: white;
		border-radius: 16px;
		transform: scale(1.05);
	}

	.server-item.active {
		background: var(--color-accent);
		color: white;
		border-radius: 16px;
	}

	.server-icon {
		width: 32px;
		height: 32px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 14px;
		overflow: hidden;
	}

	.server-icon img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.home-icon {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.action-item {
		background: var(--color-glass);
		border: 1px solid var(--color-glass-border);
	}

	.action-item:hover {
		background: var(--color-accent);
		color: white;
	}

	.server-tooltip {
		position: absolute;
		left: 60px;
		background: var(--color-bg-alt);
		color: var(--color-text);
		padding: 8px 12px;
		border-radius: 8px;
		font-size: 14px;
		white-space: nowrap;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.2s ease;
		z-index: 1000;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
	}

	.server-item:hover .server-tooltip {
		opacity: 1;
	}

	.separator {
		width: 32px;
		height: 2px;
		background: var(--color-glass-border);
		border-radius: 1px;
		margin: 4px 0;
	}

	/* Scrollbar styling */
	.server-list::-webkit-scrollbar {
		width: 0px;
	}

	.server-list::-webkit-scrollbar-track {
		background: transparent;
	}

	.server-list::-webkit-scrollbar-thumb {
		background: transparent;
	}
</style> 