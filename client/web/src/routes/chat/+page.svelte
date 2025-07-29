<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { LoadingSpinner } from '$lib/components/ui';
	import { apiClient } from '$lib/api/client';
	import { wsClient } from '$lib/api/websocket';
	import { appActions, appStore, chatActions, chatStore } from '$lib/stores/app';
	import { authStore, authActions } from '$lib/stores/auth';
	import ServerList from '$lib/components/ui/ServerList.svelte';
	import ChannelList from '$lib/components/ui/ChannelList.svelte';
	import EnhancedChatArea from '$lib/components/ui/EnhancedChatArea.svelte';
	import UserList from '$lib/components/ui/UserList.svelte';
	import VoiceControls from '$lib/components/ui/VoiceControls.svelte';
	import type { User, Server, Channel } from '$lib/types';

	let loading = true;
	let error = '';
	let currentUser: User | null = null;
	let backendAvailable = false;

	// Subscribe to stores
	$: currentServer = $appStore.currentServer;
	$: currentChannel = $appStore.currentChannel;
	$: servers = $appStore.servers;
	$: isConnected = $appStore.isConnected;

	onMount(async () => {
		try {
			// Check authentication using auth store
			const auth = $authStore;
			if (!auth.user || !auth.token) {
				goto('/');
				return;
			}

			// Set the token in the API client
			apiClient.setToken(auth.token);
			currentUser = auth.user;

			// Try to check backend availability
			try {
				await apiClient.healthCheck();
				backendAvailable = true;
				
				// Load servers
				await loadServers();

				// Connect to WebSocket
				await connectWebSocket(auth.token);

				// Set up WebSocket event listeners
				setupWebSocketListeners();

			} catch (err) {
				console.warn('Backend not available:', err);
				backendAvailable = false;
			}

		} catch (err) {
			console.error('Error:', err);
			error = 'Failed to load chat';
		} finally {
			loading = false;
		}
	});

	onDestroy(() => {
		// Disconnect WebSocket when component is destroyed
		wsClient.disconnect();
	});

	async function loadServers() {
		try {
			const serversList = await apiClient.getServers();
			appActions.setServers(serversList);
			
			// Auto-select first server if available
			if (serversList.length > 0 && !currentServer) {
				await selectServer(serversList[0]);
			}
		} catch (err) {
			console.error('Failed to load servers:', err);
		}
	}

	async function selectServer(server: Server) {
		try {
			appActions.setCurrentServer(server);
			
			// Load channels for the server
			const channels = await apiClient.getChannels(server.id);
			const serverWithChannels = { ...server, channels };
			appActions.updateServer(server.id, { channels });
			
			// Auto-select first channel if available
			if (channels.length > 0 && !currentChannel) {
				await selectChannel(channels[0]);
			}
		} catch (err) {
			console.error('Failed to load channels:', err);
		}
	}

	async function selectChannel(channel: Channel) {
		try {
			appActions.setCurrentChannel(channel);
			
			// Load messages for the channel
			await chatActions.loadMessages(channel.id);
			
			// Join channel via WebSocket
			if (wsClient.isConnected()) {
				wsClient.joinChannel(channel.id);
			}
		} catch (err) {
			console.error('Failed to load messages:', err);
		}
	}

	async function connectWebSocket(token: string) {
		try {
			await wsClient.connect(token);
			appActions.setConnectionStatus(true);
		} catch (err) {
			console.error('Failed to connect WebSocket:', err);
			appActions.setConnectionStatus(false);
		}
	}

	function setupWebSocketListeners() {
		// Listen for new messages
		wsClient.on('message', (data) => {
			if (data.type === 'message_created' && data.channelId === currentChannel?.id) {
				chatActions.addMessage(data.message);
			}
		});

		// Listen for user events
		wsClient.on('user', (data) => {
			console.log('User event:', data);
			// Update user status if needed
		});

		// Listen for typing events
		wsClient.on('typing', (data) => {
			if (data.channelId === currentChannel?.id) {
				chatActions.updateTypingUsers({
					...data,
					isTyping: data.type === 'typing_start'
				});
			}
		});

		// Listen for connection events
		wsClient.on('connected', () => {
			console.log('WebSocket connected');
			appActions.setConnectionStatus(true);
		});

		wsClient.on('disconnected', () => {
			console.log('WebSocket disconnected');
			appActions.setConnectionStatus(false);
		});
	}

	function logout() {
		if (browser) {
			wsClient.disconnect();
			appActions.reset();
			chatActions.clearChat();
			localStorage.removeItem('token');
			goto('/');
		}
	}
</script>

<svelte:head>
	<title>Fethur Chat</title>
</svelte:head>

<div class="chat-page">
	{#if currentUser && (currentUser.role === 'admin' || currentUser.role === 'super_admin')}
		<div class="admin-nav">
			<a href="/admin" class="admin-link">🔧 Admin Dashboard</a>
		</div>
	{/if}

	<!-- Voice Test Navigation -->
	<div class="voice-test-nav">
		<a href="/voice-test" class="voice-test-link">🎤 Voice Test</a>
	</div>
	
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
	{:else if !backendAvailable}
		<div class="offline-screen">
			<h2>⚠️ Backend Server Offline</h2>
			<p>The backend server is not currently available. This is a demonstration of the frontend interface.</p>
			<p><strong>To enable full functionality:</strong></p>
			<ul>
				<li>Start the backend server (make sure it's running on port 8081)</li>
				<li>Refresh this page</li>
			</ul>
			<button on:click={() => window.location.reload()}>Retry Connection</button>
		</div>
	{:else}
		<div class="chat-container">
			<!-- Server List Sidebar -->
			<aside class="server-sidebar">
				<ServerList 
					{servers}
					currentServerId={currentServer?.id || null}
					{currentUser}
					on:selectServer={(e) => selectServer(e.detail)}
				/>
			</aside>

			<!-- Channel List Sidebar -->
			<aside class="channel-sidebar">
				{#if currentServer}
					<ChannelList 
						server={currentServer}
						currentChannelId={currentChannel?.id || null}
						{currentUser}
						on:selectChannel={(e) => selectChannel(e.detail)}
					/>
				{:else}
					<div class="no-server-selected">
						<p>Select a server to view channels</p>
					</div>
				{/if}
			</aside>

			<!-- Main Chat Area -->
			<main class="chat-main">
				{#if currentChannel}
					<EnhancedChatArea 
						channel={currentChannel}
						{currentUser}
					/>
					
					<!-- Voice Controls for Voice Channels -->
					{#if currentChannel.type === 'voice'}
						<div class="voice-controls-container">
							<VoiceControls 
								channelId={currentChannel.id}
								serverId={currentServer?.id || null}
							/>
						</div>
					{/if}
				{:else}
					<div class="no-channel-selected">
						<h2>Welcome to Fethur Chat!</h2>
						<p>Select a channel to start chatting</p>
					</div>
				{/if}
			</main>

			<!-- User List Sidebar -->
			<aside class="user-sidebar">
				{#if currentServer}
					<UserList 
						server={currentServer}
						{currentUser}
					/>
				{/if}
			</aside>
		</div>

		<!-- Connection Status Bar -->
		<div class="connection-status-bar">
			<div class="status-indicator">
				{#if isConnected}
					<span class="status-online">🟢 Connected</span>
				{:else}
					<span class="status-offline">🔴 Disconnected</span>
				{/if}
			</div>
			<div class="user-info">
				Welcome, {currentUser?.username || 'User'}! 
				{#if currentUser?.role}
					<span class="user-role">({currentUser.role})</span>
				{/if}
			</div>
			<button class="logout-btn" on:click={logout}>Logout</button>
		</div>
	{/if}
</div>

<style>
	.chat-page {
		height: 100vh;
		background-color: #1a1a1a;
		color: #ffffff;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		display: flex;
		flex-direction: column;
	}

	.loading-screen, .error-screen, .offline-screen {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		gap: 1rem;
		text-align: center;
	}

	.error-screen button, .offline-screen button {
		background-color: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		cursor: pointer;
		font-weight: 500;
		transition: background-color 0.2s;
	}

	.error-screen button:hover, .offline-screen button:hover {
		background-color: #2563eb;
	}

	.offline-screen {
		max-width: 600px;
		margin: 0 auto;
		padding: 2rem;
	}

	.offline-screen h2 {
		color: #f59e0b;
		margin-bottom: 1rem;
	}

	.offline-screen ul {
		text-align: left;
		margin: 1rem 0;
		padding-left: 1.5rem;
	}

	.offline-screen li {
		margin: 0.5rem 0;
	}

	.chat-container {
		flex: 1;
		display: flex;
		overflow: hidden;
	}

	.server-sidebar {
		width: 72px;
		background-color: #2d2d2d;
		border-right: 1px solid #404040;
		flex-shrink: 0;
	}

	.channel-sidebar {
		width: 240px;
		background-color: #2d2d2d;
		border-right: 1px solid #404040;
		flex-shrink: 0;
	}

	.chat-main {
		flex: 1;
		background-color: #1a1a1a;
		display: flex;
		flex-direction: column;
	}

	.user-sidebar {
		width: 240px;
		background-color: #2d2d2d;
		border-left: 1px solid #404040;
		flex-shrink: 0;
	}

	.no-server-selected, .no-channel-selected {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		text-align: center;
		color: #6b7280;
	}

	.no-channel-selected h2 {
		color: #3b82f6;
		margin-bottom: 1rem;
	}

	.connection-status-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem 1rem;
		background-color: #2d2d2d;
		border-top: 1px solid #404040;
		flex-shrink: 0;
		font-size: 0.875rem;
	}

	.status-indicator {
		display: flex;
		align-items: center;
	}

	.status-online {
		color: #10b981;
	}

	.status-offline {
		color: #ef4444;
	}

	.user-info {
		color: #6b7280;
		flex: 1;
		text-align: center;
	}

	.user-role {
		color: #3b82f6;
		font-weight: 500;
		margin-left: 0.5rem;
	}

	.logout-btn {
		background-color: #ef4444;
		color: white;
		border: none;
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		cursor: pointer;
		font-weight: 500;
		font-size: 0.875rem;
		transition: background-color 0.2s;
	}

	.logout-btn:hover {
		background-color: #dc2626;
	}

	/* Admin Navigation */
	.admin-nav {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 100;
	}

	.admin-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-weight: 500;
		font-size: 0.875rem;
		transition: all 0.2s;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.admin-link:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 12px -1px rgba(0, 0, 0, 0.15);
	}

	/* Voice Test Navigation */
	.voice-test-nav {
		position: absolute;
		top: 1rem;
		right: 8rem;
		z-index: 100;
	}

	.voice-test-link {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		background: linear-gradient(135deg, #10b981 0%, #059669 100%);
		color: white;
		text-decoration: none;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-weight: 500;
		font-size: 0.875rem;
		transition: all 0.2s;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.voice-test-link:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 12px -1px rgba(0, 0, 0, 0.15);
	}

	/* Voice Controls */
	.voice-controls-container {
		position: fixed;
		bottom: 4rem;
		right: 1rem;
		z-index: 50;
		max-width: 300px;
	}

	/* Responsive design */
	@media (max-width: 1024px) {
		.user-sidebar {
			display: none;
		}
	}

	@media (max-width: 768px) {
		.channel-sidebar {
			width: 200px;
		}
	}

	@media (max-width: 640px) {
		.server-sidebar, .channel-sidebar {
			display: none;
		}
	}
</style> 