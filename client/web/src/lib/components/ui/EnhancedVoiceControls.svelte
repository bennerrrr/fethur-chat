<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { voiceClient, type VoiceState, type VoiceSettings } from '$lib/webrtc/voice';
	import { authStore } from '$lib/stores/auth';
	import type { Channel, User } from '$lib/types';

	export let channel: Channel | null = null;
	export let currentUser: User | null = null;

	let voiceState: VoiceState;
	let voiceSettings: VoiceSettings;
	let isConnecting = false;
	let isDisconnecting = false;
	let error = '';
	let showSettings = false;
	let showParticipants = false;
	let showDisconnectConfirm = false;
	let showSuccessMessage = false;

	// Subscribe to voice state and settings
	onMount(() => {
		const unsubscribeState = voiceClient.stateStore.subscribe(state => {
			voiceState = state;
		});

		const unsubscribeSettings = voiceClient.settingsStore.subscribe(settings => {
			voiceSettings = settings;
		});

		// Add keyboard event listener for Escape key and quick disconnect
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape' && showDisconnectConfirm) {
				cancelDisconnect();
			}
			
			// Quick disconnect with Ctrl+D (or Cmd+D on Mac)
			if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
				event.preventDefault();
				if (voiceState?.isConnected && voiceState?.currentChannelId) {
					confirmDisconnect();
				}
			}
		};

		document.addEventListener('keydown', handleKeyDown);

		return () => {
			unsubscribeState();
			unsubscribeSettings();
			document.removeEventListener('keydown', handleKeyDown);
		};
	});

	onDestroy(() => {
		// Clean up voice connection when component is destroyed
		if (voiceState?.currentChannelId) {
			voiceClient.leaveChannel();
		}
	});

	async function connectVoice() {
		if (!channel || !currentUser) {
			error = 'No channel or user selected';
			return;
		}

		const token = $authStore.token;
		if (!token) {
			error = 'Not authenticated';
			return;
		}

		isConnecting = true;
		error = '';

		try {
			// Connect to voice server using relative URL to leverage Vite's proxy
			await voiceClient.connect(token, '');
			
			// Start local audio stream
			await voiceClient.startLocalStream();
			
			// Join voice channel
			await voiceClient.joinChannel(channel.id, channel.serverId);
			
			// Handle audio autoplay after user interaction
			setTimeout(() => {
				voiceClient.handleAudioAutoplay();
			}, 1000);
			
		} catch (err: any) {
			console.error('Failed to connect voice:', err);
			error = err.message || 'Failed to connect to voice channel';
		} finally {
			isConnecting = false;
		}
	}

	async function disconnectVoice() {
		if (isDisconnecting) {
			return; // Prevent multiple clicks
		}
		
		isDisconnecting = true;
		error = '';
		
		try {
			console.log('Disconnecting from voice channel...');
			await voiceClient.leaveChannel();
			showDisconnectConfirm = false;
			showSuccessMessage = true;
			setTimeout(() => {
				showSuccessMessage = false;
			}, 3000);
			console.log('Successfully disconnected from voice channel');
		} catch (err) {
			console.error('Failed to disconnect voice:', err);
			error = 'Failed to disconnect from voice channel';
			// Even if there's an error, try to force disconnect
			try {
				console.log('Attempting force disconnect...');
				voiceClient.forceDisconnect();
				showDisconnectConfirm = false;
				showSuccessMessage = true;
				setTimeout(() => {
					showSuccessMessage = false;
				}, 3000);
				console.log('Force disconnect completed');
			} catch (forceErr) {
				console.error('Failed to force disconnect:', forceErr);
			}
		} finally {
			isDisconnecting = false;
		}
	}

	function confirmDisconnect() {
		if (!voiceState?.isConnected || !voiceState?.currentChannelId) {
			console.log('Not connected to voice channel, cannot disconnect');
			return;
		}
		showDisconnectConfirm = true;
	}

	function cancelDisconnect() {
		showDisconnectConfirm = false;
	}

	function toggleMute() {
		if (!voiceState) return;
		voiceClient.setMuted(!voiceState.isMuted);
	}

	function toggleDeafen() {
		if (!voiceState) return;
		voiceClient.setDeafened(!voiceState.isDeafened);
	}

	function getConnectionQualityIcon(quality: string) {
		switch (quality) {
			case 'excellent': return '📶';
			case 'good': return '📶';
			case 'poor': return '📵';
			default: return '❌';
		}
	}

	function getConnectionQualityColor(quality: string) {
		switch (quality) {
			case 'excellent': return '#10b981';
			case 'good': return '#f59e0b';
			case 'poor': return '#ef4444';
			default: return '#6b7280';
		}
	}
</script>

<div class="voice-controls" class:connected={voiceState?.isConnected}>
	{#if channel?.type === 'voice'}
		<div class="voice-header">
			<div class="channel-info">
				<span class="voice-icon">🎤</span>
				<span class="channel-name">{channel.name}</span>
				{#if voiceState?.isConnected}
					<span class="connection-status connected">Connected</span>
				{:else}
					<span class="connection-status">Disconnected</span>
				{/if}
			</div>

			<div class="voice-actions">
				<button
					class="voice-btn join-btn"
					class:connected={voiceState?.isConnected}
					on:click={voiceState?.isConnected ? confirmDisconnect : connectVoice}
					disabled={!currentUser || isConnecting || isDisconnecting || (voiceState?.isConnected && !voiceState?.currentChannelId)}
					title={voiceState?.isConnected ? 'Leave Voice Channel (Ctrl+D)' : 'Join Voice Channel'}
				>
					{#if isConnecting}
						⏳ Connecting...
					{:else if isDisconnecting}
						⏳ Disconnecting...
					{:else if voiceState?.isConnected}
						🔌 Disconnect
					{:else}
						🎤 Join Voice
					{/if}
				</button>

				{#if voiceState?.isConnected && voiceState.peers.size > 0}
					<button
						class="voice-btn participants-btn"
						on:click={() => showParticipants = !showParticipants}
					>
						👥 {voiceState.peers.size}
					</button>
				{/if}
			</div>
		</div>

		{#if voiceState?.isConnected}
			<div class="voice-status">
				<div class="local-controls">
					<button
						class="control-btn mute-btn"
						class:active={voiceState?.isMuted}
						on:click={toggleMute}
						title={voiceState?.isMuted ? 'Unmute' : 'Mute'}
					>
						{#if voiceState?.isMuted}
							🔇
						{:else}
							🎤
						{/if}
					</button>

					<button
						class="control-btn deafen-btn"
						class:active={voiceState?.isDeafened}
						on:click={toggleDeafen}
						title={voiceState?.isDeafened ? 'Undeafen' : 'Deafen'}
					>
						{#if voiceState?.isDeafened}
							🔇
						{:else}
							🔊
						{/if}
					</button>

					<button
						class="control-btn settings-btn"
						on:click={() => showSettings = !showSettings}
						title="Voice Settings"
					>
						⚙️
					</button>
				</div>

				{#if error}
					<div class="voice-error">
						<span class="error-icon">⚠️</span>
						<span class="error-text">{error}</span>
					</div>
				{/if}
			</div>

			{#if showParticipants}
				<div class="participants-panel">
					<h4 class="participants-title">Voice Participants ({voiceState?.peers.size || 0})</h4>
					<div class="participants-list">
						<!-- Note: Individual participant info not available in current voice state -->
						<div class="participant">
							<div class="participant-info">
								<span class="participant-name">Connected peers: {voiceState?.peers.size || 0}</span>
							</div>
						</div>
					</div>
				</div>
			{/if}

			{#if showSettings}
				<div class="settings-panel">
					<h4 class="settings-title">Voice Settings</h4>
					
					<div class="setting-group">
						<label class="setting-label">
							<input
								type="checkbox"
								checked={voiceSettings?.echoCancellation}
								on:change={() => voiceClient.updateSettings({ echoCancellation: !voiceSettings?.echoCancellation })}
							/>
							Echo Cancellation
						</label>
					</div>

					<div class="setting-group">
						<label class="setting-label">
							<input
								type="checkbox"
								checked={voiceSettings?.noiseSuppression}
								on:change={() => voiceClient.updateSettings({ noiseSuppression: !voiceSettings?.noiseSuppression })}
							/>
							Noise Suppression
						</label>
					</div>

					<div class="setting-group">
						<label class="setting-label">
							<input
								type="checkbox"
								checked={voiceSettings?.pushToTalk}
								on:change={() => voiceClient.updateSettings({ pushToTalk: !voiceSettings?.pushToTalk })}
							/>
							Push to Talk
						</label>
					</div>

					{#if voiceSettings?.pushToTalk}
						<div class="setting-group">
							<label class="setting-label">
								Push to Talk Key
								<input
									type="text"
									value={voiceSettings?.pushToTalkKey}
									readonly
									class="key-input"
									placeholder="Press a key..."
								/>
							</label>
						</div>
					{/if}

					<div class="setting-group">
						<label class="setting-label">
							Input Volume
							<input
								type="range"
								min="0"
								max="100"
								value={voiceSettings?.inputVolume}
								on:input={(e) => voiceClient.updateSettings({ inputVolume: parseInt((e.target as HTMLInputElement).value) })}
								class="volume-slider"
							/>
							<span class="volume-value">{voiceSettings?.inputVolume}%</span>
						</label>
					</div>

					<div class="setting-group">
						<label class="setting-label">
							Output Volume
							<input
								type="range"
								min="0"
								max="100"
								value={voiceSettings?.outputVolume}
								on:input={(e) => voiceClient.updateSettings({ outputVolume: parseInt((e.target as HTMLInputElement).value) })}
								class="volume-slider"
							/>
							<span class="volume-value">{voiceSettings?.outputVolume}%</span>
						</label>
					</div>
				</div>
			{/if}
		{/if}
	{/if}

	<!-- Disconnect Confirmation Modal -->
	{#if showDisconnectConfirm}
		<div class="modal-overlay" on:click={cancelDisconnect}>
			<div class="modal-content" on:click|stopPropagation>
				<div class="modal-header">
					<h3>Leave Voice Channel</h3>
				</div>
				<div class="modal-body">
					<p>Are you sure you want to leave the voice channel?</p>
					<p class="modal-subtitle">You will be disconnected from all voice participants.</p>
				</div>
				<div class="modal-footer">
					<button class="btn btn-secondary" on:click={cancelDisconnect}>
						Cancel
					</button>
					<button class="btn btn-danger" on:click={disconnectVoice}>
						Leave Channel
					</button>
				</div>
			</div>
		</div>
	{/if}

	<!-- Success Message -->
	{#if showSuccessMessage}
		<div class="success-message">
			<span class="success-icon">✅</span>
			<span class="success-text">Successfully left voice channel</span>
		</div>
	{/if}
</div>

<style>
	.voice-controls {
		background-color: var(--surface-color, #2d2d2d);
		border: 1px solid var(--border-color, #404040);
		border-radius: 0.5rem;
		padding: 1rem;
		margin: 1rem;
	}

	.voice-controls.connected {
		border-color: var(--accent-color, #3b82f6);
		background-color: rgba(59, 130, 246, 0.05);
	}

	.voice-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
	}

	.channel-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.voice-icon {
		font-size: 1.25rem;
	}

	.channel-name {
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.connection-status {
		font-size: 0.875rem;
		color: var(--text-muted, #6b7280);
		padding: 0.25rem 0.5rem;
		border-radius: 0.25rem;
		background-color: var(--surface-color, #2d2d2d);
	}

	.connection-status.connected {
		color: #10b981;
		background-color: rgba(16, 185, 129, 0.1);
	}

	.voice-actions {
		display: flex;
		gap: 0.5rem;
	}

	.voice-btn {
		padding: 0.5rem 1rem;
		background-color: var(--accent-color, #3b82f6);
		color: white;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-weight: 500;
		transition: all 0.2s;
	}

	.voice-btn:hover {
		background-color: var(--accent-hover, #2563eb);
	}

	.voice-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.join-btn.connected {
		background-color: #ef4444;
	}

	.join-btn.connected:hover {
		background-color: #dc2626;
	}

	.participants-btn {
		background-color: var(--surface-color, #2d2d2d);
		color: var(--text-primary, #ffffff);
		border: 1px solid var(--border-color, #404040);
	}

	.voice-status {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.local-controls {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.control-btn {
		padding: 0.75rem;
		background-color: var(--surface-color, #2d2d2d);
		border: 1px solid var(--border-color, #404040);
		border-radius: 0.5rem;
		cursor: pointer;
		font-size: 1.25rem;
		transition: all 0.2s;
		color: var(--text-primary, #ffffff);
	}

	.control-btn:hover {
		background-color: var(--accent-color, #3b82f6);
	}

	.control-btn.active {
		background-color: #ef4444;
		border-color: #ef4444;
	}

	.voice-error {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem;
		background-color: rgba(239, 68, 68, 0.1);
		border: 1px solid #ef4444;
		border-radius: 0.375rem;
	}

	.error-icon {
		font-size: 1.25rem;
	}

	.error-text {
		color: #ef4444;
		font-weight: 500;
	}

	.participants-panel, .settings-panel {
		background-color: var(--input-bg, #1a1a1a);
		border: 1px solid var(--border-color, #404040);
		border-radius: 0.5rem;
		padding: 1rem;
		margin-top: 1rem;
	}

	.participants-title, .settings-title {
		margin: 0 0 1rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary, #ffffff);
	}

	.participants-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.participant {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem;
		background-color: var(--surface-color, #2d2d2d);
		border-radius: 0.375rem;
	}

	.participant-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.participant-name {
		font-weight: 500;
		color: var(--text-primary, #ffffff);
	}

	.participant-status {
		display: flex;
		gap: 0.25rem;
	}

	.speaking-indicator {
		color: #10b981;
	}

	.muted-indicator, .deafened-indicator {
		color: #ef4444;
	}

	.participant-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.volume-control {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.setting-group {
		margin-bottom: 1rem;
	}

	.setting-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-primary, #ffffff);
		font-weight: 500;
	}

	.setting-label input[type="checkbox"] {
		margin: 0;
	}

	.volume-slider {
		width: 100px;
		margin: 0 0.5rem;
	}

	.volume-value {
		font-size: 0.875rem;
		color: var(--text-muted, #6b7280);
		min-width: 3rem;
	}

	.key-input {
		background-color: var(--surface-color, #2d2d2d);
		border: 1px solid var(--border-color, #404040);
		border-radius: 0.25rem;
		padding: 0.25rem 0.5rem;
		color: var(--text-primary, #ffffff);
		margin-left: 0.5rem;
	}

	.connection-quality {
		font-size: 1rem;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.voice-header {
			flex-direction: column;
			gap: 0.75rem;
			align-items: stretch;
		}

		.voice-actions {
			justify-content: center;
		}

		.local-controls {
			justify-content: center;
		}

		.participant {
			flex-direction: column;
			gap: 0.5rem;
			text-align: center;
		}
	}

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background-color: var(--surface-color, #2d2d2d);
		border: 1px solid var(--border-color, #404040);
		border-radius: 0.5rem;
		padding: 1.5rem;
		max-width: 400px;
		width: 90%;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
	}

	.modal-header {
		margin-bottom: 1rem;
	}

	.modal-header h3 {
		margin: 0;
		color: var(--text-primary, #ffffff);
		font-size: 1.25rem;
		font-weight: 600;
	}

	.modal-body {
		margin-bottom: 1.5rem;
	}

	.modal-body p {
		margin: 0 0 0.5rem 0;
		color: var(--text-primary, #ffffff);
	}

	.modal-subtitle {
		font-size: 0.875rem;
		color: var(--text-muted, #6b7280) !important;
	}

	.modal-footer {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	.btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.25rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.btn-secondary {
		background-color: var(--surface-color, #404040);
		color: var(--text-primary, #ffffff);
	}

	.btn-secondary:hover {
		background-color: var(--border-color, #505050);
	}

	.btn-danger {
		background-color: #ef4444;
		color: white;
	}

	.btn-danger:hover {
		background-color: #dc2626;
	}

	/* Success Message */
	.success-message {
		position: fixed;
		top: 1rem;
		right: 1rem;
		background-color: #10b981;
		color: white;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		z-index: 1001;
		animation: slideIn 0.3s ease-out;
	}

	.success-icon {
		font-size: 1.125rem;
	}

	.success-text {
		font-weight: 500;
	}

	@keyframes slideIn {
		from {
			transform: translateX(100%);
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}
</style>
