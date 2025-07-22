<script lang="ts">
	import { onMount } from 'svelte';
	import { voiceStore, voiceActions, currentVoiceConnection, isConnectedToVoice } from '$lib/stores/voice';
	import type { Channel, User } from '$lib/types';

	export let channel: Channel | null = null;
	export let currentUser: User | null = null;

	let audioDevices: MediaDeviceInfo[] = [];
	let showSettings = false;
	let showParticipants = false;

	$: connection = $currentVoiceConnection;
	$: isConnected = $isConnectedToVoice;
	$: participants = connection?.participants || [];

	onMount(async () => {
		// Load available audio devices
		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			audioDevices = devices.filter(device => device.kind === 'audioinput');
		} catch (error) {
			console.error('Failed to load audio devices:', error);
		}
	});

	async function toggleVoiceConnection() {
		if (!channel || !currentUser) return;

		try {
			if (isConnected) {
				await voiceActions.leaveVoiceChannel();
			} else {
				// Construct WebSocket URL for voice
				const wsUrl = `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/voice`;
				await voiceActions.joinVoiceChannel(channel.id, currentUser.id, wsUrl);
			}
		} catch (error) {
			console.error('Failed to toggle voice connection:', error);
		}
	}

	function toggleMute() {
		voiceActions.toggleMute();
	}

	function toggleDeafen() {
		voiceActions.toggleDeafen();
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

<div class="voice-controls" class:connected={isConnected}>
	{#if channel?.type === 'voice'}
		<div class="voice-header">
			<div class="channel-info">
				<span class="voice-icon">🎤</span>
				<span class="channel-name">{channel.name}</span>
				{#if isConnected}
					<span class="connection-status connected">Connected</span>
				{:else}
					<span class="connection-status">Disconnected</span>
				{/if}
			</div>

			<div class="voice-actions">
				<button
					class="voice-btn join-btn"
					class:connected={isConnected}
					on:click={toggleVoiceConnection}
					disabled={!currentUser}
				>
					{#if isConnected}
						🔌 Disconnect
					{:else}
						🎤 Join Voice
					{/if}
				</button>

				{#if isConnected && participants.length > 0}
					<button
						class="voice-btn participants-btn"
						on:click={() => showParticipants = !showParticipants}
					>
						👥 {participants.length}
					</button>
				{/if}
			</div>
		</div>

		{#if isConnected && connection}
			<div class="voice-status">
				<div class="local-controls">
					<button
						class="control-btn mute-btn"
						class:active={connection.isMuted}
						on:click={toggleMute}
						title={connection.isMuted ? 'Unmute' : 'Mute'}
					>
						{#if connection.isMuted}
							🔇
						{:else}
							🎤
						{/if}
					</button>

					<button
						class="control-btn deafen-btn"
						class:active={connection.isDeafened}
						on:click={toggleDeafen}
						title={connection.isDeafened ? 'Undeafen' : 'Deafen'}
					>
						{#if connection.isDeafened}
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

				{#if $voiceStore.error}
					<div class="voice-error">
						<span class="error-icon">⚠️</span>
						<span class="error-text">{$voiceStore.error}</span>
					</div>
				{/if}
			</div>

			{#if showParticipants}
				<div class="participants-panel">
					<h4 class="participants-title">Voice Participants ({participants.length})</h4>
					<div class="participants-list">
						{#each participants as participant}
							<div class="participant">
								<div class="participant-info">
									<span class="participant-name">{participant.user.username}</span>
									<div class="participant-status">
										{#if participant.isSpeaking}
											<span class="speaking-indicator">🎤</span>
										{/if}
										{#if participant.isMuted}
											<span class="muted-indicator">🔇</span>
										{/if}
										{#if participant.isDeafened}
											<span class="deafened-indicator">🔇</span>
										{/if}
									</div>
								</div>
								<div class="participant-controls">
									<span 
										class="connection-quality"
										style="color: {getConnectionQualityColor(participant.connectionQuality)}"
										title="Connection: {participant.connectionQuality}"
									>
										{getConnectionQualityIcon(participant.connectionQuality)}
									</span>
									<div class="volume-control">
										<input
											type="range"
											min="0"
											max="100"
											value={participant.volume}
											class="volume-slider"
											title="Volume: {participant.volume}%"
										/>
									</div>
								</div>
							</div>
						{/each}
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
								bind:checked={$voiceStore.settings.echoCancellation}
								on:change={() => voiceActions.updateSettings({ echoCancellation: $voiceStore.settings.echoCancellation })}
							/>
							Echo Cancellation
						</label>
					</div>

					<div class="setting-group">
						<label class="setting-label">
							<input
								type="checkbox"
								bind:checked={$voiceStore.settings.noiseSuppression}
								on:change={() => voiceActions.updateSettings({ noiseSuppression: $voiceStore.settings.noiseSuppression })}
							/>
							Noise Suppression
						</label>
					</div>

					<div class="setting-group">
						<label class="setting-label">
							<input
								type="checkbox"
								bind:checked={$voiceStore.settings.pushToTalk}
								on:change={() => voiceActions.updateSettings({ pushToTalk: $voiceStore.settings.pushToTalk })}
							/>
							Push to Talk
						</label>
					</div>

					{#if $voiceStore.settings.pushToTalk}
						<div class="setting-group">
							<label class="setting-label">
								Push to Talk Key
								<input
									type="text"
									value={$voiceStore.settings.pushToTalkKey}
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
								bind:value={$voiceStore.settings.inputVolume}
								on:input={() => voiceActions.updateSettings({ inputVolume: $voiceStore.settings.inputVolume })}
								class="volume-slider"
							/>
							<span class="volume-value">{$voiceStore.settings.inputVolume}%</span>
						</label>
					</div>

					<div class="setting-group">
						<label class="setting-label">
							Output Volume
							<input
								type="range"
								min="0"
								max="100"
								bind:value={$voiceStore.settings.outputVolume}
								on:input={() => voiceActions.updateSettings({ outputVolume: $voiceStore.settings.outputVolume })}
								class="volume-slider"
							/>
							<span class="volume-value">{$voiceStore.settings.outputVolume}%</span>
						</label>
					</div>
				</div>
			{/if}
		{/if}
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
</style>
