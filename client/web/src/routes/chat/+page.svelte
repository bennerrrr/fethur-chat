<script lang="ts">
	import { onMount } from 'svelte';
	import { 
		ServerList, 
		ChannelList, 
		ChatArea, 
		UserList, 
		Modal,
		LoadingSpinner 
	} from '$lib/components/ui';
	import { appStore, appActions, chatStore, chatActions } from '$lib/stores/app';
	import { apiClient } from '$lib/api/client';
	import type { Server, Channel, User } from '$lib/types';

	let currentUser: User | null = null;
	let loading = true;
	let error = '';
	let showCreateServerModal = false;
	let showCreateChannelModal = false;
	let showSettingsModal = false;

	// Modal data
	let newServerData = { name: '', description: '' };
	let newChannelData = { name: '', type: 'text' as 'text' | 'voice', description: '' };

	onMount(async () => {
		const token = localStorage.getItem('token');
		if (!token) {
			window.location.href = '/';
			return;
		}

		try {
			// Get current user
			currentUser = await apiClient.getCurrentUser();
			
			// Load servers
			await appActions.loadServers();
			
			// Auto-select first server if available
			const servers = $appStore.servers;
			if (servers.length > 0 && !$appStore.currentServer) {
				await appActions.setCurrentServer(servers[0]);
			}
		} catch (err) {
			console.error('Failed to load chat data:', err);
			error = 'Failed to load chat data';
		} finally {
			loading = false;
		}
	});

	async function handleServerSelect(server: Server) {
		try {
			await appActions.setCurrentServer(server);
		} catch (err) {
			console.error('Failed to select server:', err);
		}
	}

	async function handleChannelSelect(channel: Channel) {
		try {
			await appActions.setCurrentChannel(channel);
		} catch (err) {
			console.error('Failed to select channel:', err);
		}
	}

	async function handleCreateServer() {
		try {
			await appActions.createServer(newServerData.name, newServerData.description);
			showCreateServerModal = false;
			newServerData = { name: '', description: '' };
		} catch (err) {
			console.error('Failed to create server:', err);
		}
	}

	async function handleCreateChannel(data: { type: 'text' | 'voice' }) {
		if (!$appStore.currentServer) return;
		
		try {
			await appActions.createChannel($appStore.currentServer.id, newChannelData.name, data.type, newChannelData.description);
			showCreateChannelModal = false;
			newChannelData = { name: '', type: 'text', description: '' };
		} catch (err) {
			console.error('Failed to create channel:', err);
		}
	}

	async function handleSendMessage(content: string) {
		if (!$appStore.currentChannel) return;
		
		try {
			await chatActions.sendMessage($appStore.currentChannel.id, content);
		} catch (err) {
			console.error('Failed to send message:', err);
		}
	}

	function handleLoadMoreMessages() {
		if ($appStore.currentChannel) {
			chatActions.loadMessages($appStore.currentChannel.id, 1);
		}
	}

	function logout() {
		localStorage.removeItem('token');
		window.location.href = '/';
	}
</script>

{#if loading}
	<div class="loading-screen">
		<LoadingSpinner size="lg" />
		<p>Loading chat...</p>
	</div>
{:else if error}
	<div class="error-screen">
		<p>{error}</p>
		<button on:click={() => window.location.reload()}>Retry</button>
	</div>
{:else}
	<div style="display: flex; height: 100vh;">
		<!-- Server List Sidebar -->
	<ServerList 
		servers={$appStore.servers}
		currentServerId={$appStore.currentServer?.id || null}
		{currentUser}
		on:selectServer={({ detail }) => handleServerSelect(detail)}
		on:createServer={() => showCreateServerModal = true}
		on:openSettings={() => showSettingsModal = true}
	/>

	<!-- Channel List Sidebar -->
	<ChannelList 
		server={$appStore.currentServer}
		currentChannelId={$appStore.currentChannel?.id || null}
		{currentUser}
		on:selectChannel={({ detail }) => handleChannelSelect(detail)}
		on:createChannel={({ detail }) => handleCreateChannel(detail)}
		on:openChannelSettings={() => showSettingsModal = true}
	/>

	<!-- Main Chat Area -->
	<ChatArea 
		channel={$appStore.currentChannel}
		messages={$chatStore.messages}
		typingUsers={$chatStore.typingUsers}
		isLoadingMessages={$chatStore.isLoadingMessages}
		hasMoreMessages={$chatStore.hasMoreMessages}
		{currentUser}
		on:sendMessage={({ detail }) => handleSendMessage(detail)}
		on:loadMoreMessages={handleLoadMoreMessages}
	/>

	<!-- User List Sidebar -->
	<UserList 
		server={$appStore.currentServer}
		{currentUser}
	/>
	</div>

	<!-- Create Server Modal -->
	{#if showCreateServerModal}
		<Modal on:close={() => showCreateServerModal = false}>
			<div class="modal-content">
				<h2>Create Server</h2>
				<form on:submit|preventDefault={handleCreateServer}>
					<div class="form-group">
						<label for="serverName">Server Name</label>
						<input 
							id="serverName"
							type="text" 
							bind:value={newServerData.name}
							placeholder="Enter server name"
							required
						/>
					</div>
					<div class="form-group">
						<label for="serverDescription">Description (optional)</label>
						<textarea 
							id="serverDescription"
							bind:value={newServerData.description}
							placeholder="Enter server description"
							rows="3"
						></textarea>
					</div>
					<div class="modal-actions">
						<button type="button" on:click={() => showCreateServerModal = false}>
							Cancel
						</button>
						<button type="submit" class="primary">
							Create Server
						</button>
					</div>
				</form>
			</div>
		</Modal>
	{/if}

	<!-- Create Channel Modal -->
	{#if showCreateChannelModal}
		<Modal on:close={() => showCreateChannelModal = false}>
			<div class="modal-content">
				<h2>Create Channel</h2>
				<form on:submit|preventDefault={() => handleCreateChannel({ type: newChannelData.type })}>
					<div class="form-group">
						<label for="channelName">Channel Name</label>
						<input 
							id="channelName"
							type="text" 
							bind:value={newChannelData.name}
							placeholder="Enter channel name"
							required
						/>
					</div>
					<div class="form-group">
						<label for="channelType">Channel Type</label>
						<select id="channelType" bind:value={newChannelData.type}>
							<option value="text">Text Channel</option>
							<option value="voice">Voice Channel</option>
						</select>
					</div>
					<div class="form-group">
						<label for="channelDescription">Description (optional)</label>
						<textarea 
							id="channelDescription"
							bind:value={newChannelData.description}
							placeholder="Enter channel description"
							rows="3"
						></textarea>
					</div>
					<div class="modal-actions">
						<button type="button" on:click={() => showCreateChannelModal = false}>
							Cancel
						</button>
						<button type="submit" class="primary">
							Create Channel
						</button>
					</div>
				</form>
			</div>
		</Modal>
	{/if}
{/if}

<style>
	.loading-screen,
	.error-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		gap: 16px;
		color: var(--color-text);
	}

	/* Chat layout is now handled by the main layout */

	.modal-content {
		background: var(--color-bg-alt);
		border: 1px solid var(--color-glass-border);
		border-radius: 12px;
		padding: 24px;
		min-width: 400px;
	}

	.modal-content h2 {
		margin: 0 0 24px 0;
		color: var(--color-text);
		font-size: 20px;
		font-weight: 600;
	}

	.form-group {
		margin-bottom: 16px;
	}

	.form-group label {
		display: block;
		margin-bottom: 8px;
		color: var(--color-text);
		font-weight: 500;
	}

	.form-group input,
	.form-group textarea,
	.form-group select {
		width: 100%;
		padding: 12px;
		background: var(--color-glass);
		border: 1px solid var(--color-glass-border);
		border-radius: 8px;
		color: var(--color-text);
		font-size: 14px;
		font-family: inherit;
	}

	.form-group input:focus,
	.form-group textarea:focus,
	.form-group select:focus {
		outline: none;
		border-color: var(--color-accent);
	}

	.modal-actions {
		display: flex;
		gap: 12px;
		justify-content: flex-end;
		margin-top: 24px;
	}

	.modal-actions button {
		padding: 10px 20px;
		border-radius: 8px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.modal-actions button:not(.primary) {
		background: transparent;
		border: 1px solid var(--color-glass-border);
		color: var(--color-text);
	}

	.modal-actions button.primary {
		background: var(--color-accent);
		border: none;
		color: white;
	}

	.modal-actions button:hover {
		transform: translateY(-1px);
	}
</style> 