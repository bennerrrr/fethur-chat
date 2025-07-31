<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Mic, MicOff, Headphones, Settings, Volume2, VolumeX } from 'lucide-svelte';
	import { voiceClient, type VoiceState, type VoiceSettings } from '$lib/webrtc/voice';
	import { apiClient } from '$lib/api/client';
	import { authStore } from '$lib/stores/auth';

	export let channelId: number | null = null;
	export let serverId: number | null = null;

	let voiceState: VoiceState;
	let voiceSettings: VoiceSettings;
	let isConnecting = false;
	let error = '';
	let showSettings = false;
	let audioDevices: MediaDeviceInfo[] = [];
	let isPushToTalkActive = false;

	// Subscribe to voice state and settings
	onMount(() => {
		const unsubscribeState = voiceClient.stateStore.subscribe(state => {
			voiceState = state;
		});

		const unsubscribeSettings = voiceClient.settingsStore.subscribe(settings => {
			voiceSettings = settings;
		});

		// Set up push-to-talk keyboard listener
		if (typeof window !== 'undefined') {
			window.addEventListener('keydown', handleKeyDown);
			window.addEventListener('keyup', handleKeyUp);
		}

		// Load audio devices
		loadAudioDevices();

		return () => {
			unsubscribeState();
			unsubscribeSettings();
			if (typeof window !== 'undefined') {
				window.removeEventListener('keydown', handleKeyDown);
				window.removeEventListener('keyup', handleKeyUp);
			}
		};
	});

	onDestroy(() => {
		// Clean up voice connection when component is destroyed
		if (voiceState?.currentChannelId) {
			voiceClient.leaveChannel();
		}
	});

	async function loadAudioDevices() {
		try {
			audioDevices = await voiceClient.getAudioDevices();
		} catch (err) {
			console.error('Failed to load audio devices:', err);
		}
	}

	async function connectVoice() {
		if (!channelId || !serverId) {
			error = 'No channel or server selected';
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
			await voiceClient.joinChannel(channelId, serverId);
			
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
		try {
			console.log('Disconnecting from voice channel...');
			await voiceClient.leaveChannel();
			console.log('Successfully disconnected from voice channel');
		} catch (err) {
			console.error('Failed to disconnect voice:', err);
			// Even if there's an error, try to force disconnect
			try {
				console.log('Attempting force disconnect...');
				voiceClient.forceDisconnect();
				console.log('Force disconnect completed');
			} catch (forceErr) {
				console.error('Failed to force disconnect:', forceErr);
			}
		}
	}

	function toggleMute() {
		if (!voiceState) return;
		voiceClient.setMuted(!voiceState.isMuted);
	}

	function toggleDeafen() {
		if (!voiceState) return;
		voiceClient.setDeafened(!voiceState.isDeafened);
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (!voiceSettings?.pushToTalk) return;
		
		if (event.code === `Key${voiceSettings.pushToTalkKey.toUpperCase()}` || 
			event.code === `Space` && voiceSettings.pushToTalkKey === 'Space') {
			event.preventDefault();
			if (!isPushToTalkActive) {
				isPushToTalkActive = true;
				voiceClient.setMuted(false);
			}
		}
	}

	function handleKeyUp(event: KeyboardEvent) {
		if (!voiceSettings?.pushToTalk) return;
		
		if (event.code === `Key${voiceSettings.pushToTalkKey.toUpperCase()}` || 
			event.code === `Space` && voiceSettings.pushToTalkKey === 'Space') {
			event.preventDefault();
			if (isPushToTalkActive) {
				isPushToTalkActive = false;
				voiceClient.setMuted(true);
			}
		}
	}

	function updateSetting(key: keyof VoiceSettings, value: any) {
		voiceClient.updateSettings({ [key]: value });
	}

	function getConnectionQualityColor() {
		switch (voiceState?.connectionQuality) {
			case 'excellent': return 'text-green-500';
			case 'good': return 'text-yellow-500';
			case 'poor': return 'text-red-500';
			default: return 'text-gray-500';
		}
	}

	function getConnectionQualityText() {
		switch (voiceState?.connectionQuality) {
			case 'excellent': return 'Excellent';
			case 'good': return 'Good';
			case 'poor': return 'Poor';
			default: return 'Disconnected';
		}
	}
</script>

<div class="voice-controls">
	<!-- Connection Status -->
	<div class="voice-status">
		{#if voiceState?.isConnected}
			<div class="status-indicator connected">
				<div class="status-dot {getConnectionQualityColor()}"></div>
				<span class="status-text">{getConnectionQualityText()}</span>
			</div>
		{:else}
			<div class="status-indicator disconnected">
				<div class="status-dot text-gray-500"></div>
				<span class="status-text">Disconnected</span>
			</div>
		{/if}
	</div>

	<!-- Voice Controls -->
	<div class="voice-buttons">
		{#if voiceState?.isConnected}
			<!-- Mute Button -->
			<button 
				class="voice-btn {voiceState.isMuted ? 'muted' : ''} {voiceState.isSpeaking ? 'speaking' : ''}"
				on:click={toggleMute}
				title="{voiceState.isMuted ? 'Unmute' : 'Mute'} ({voiceSettings?.pushToTalk ? voiceSettings.pushToTalkKey : 'Voice Activity'})"
			>
				{#if voiceState.isMuted}
					<MicOff size={20} />
				{:else}
					<Mic size={20} />
				{/if}
			</button>

			<!-- Deafen Button -->
			<button 
				class="voice-btn {voiceState.isDeafened ? 'deafened' : ''}"
				on:click={toggleDeafen}
				title="{voiceState.isDeafened ? 'Undeafen' : 'Deafen'}"
			>
				{#if voiceState.isDeafened}
					<VolumeX size={20} />
				{:else}
					<Volume2 size={20} />
				{/if}
			</button>

			<!-- Settings Button -->
			<button 
				class="voice-btn settings"
				on:click={() => showSettings = !showSettings}
				title="Voice Settings"
			>
				<Settings size={20} />
			</button>

			<!-- Disconnect Button -->
			<button 
				class="voice-btn disconnect"
				on:click={disconnectVoice}
				title="Leave Voice Channel"
			>
				<Headphones size={20} />
			</button>

		{:else}
			<!-- Connect Button -->
			<button 
				class="voice-btn connect"
				on:click={connectVoice}
				disabled={isConnecting || !channelId}
				title="Join Voice Channel"
			>
				{#if isConnecting}
					<div class="loading-spinner"></div>
				{:else}
					<Headphones size={20} />
				{/if}
			</button>
		{/if}
	</div>

	<!-- Always visible debug button -->
	<button 
		class="debug-btn always-visible"
		on:click={() => voiceClient.debugState()}
		title="Show current voice state"
	>
		🐛 Debug
	</button>

	<!-- Force disconnect button for user switching -->
	<button 
		class="debug-btn always-visible force-disconnect"
		on:click={() => voiceClient.forceDisconnect()}
		title="Force disconnect (use when switching users)"
	>
		🚫 Force Disconnect
	</button>

	<!-- Error Display -->
	{#if error}
		<div class="voice-error">
			<span>{error}</span>
			<button on:click={() => error = ''} class="error-close">×</button>
		</div>
	{/if}

	<!-- Debug Tools (show when there are issues or when trying to connect) -->
	{#if error || isConnecting || voiceState?.isConnected}
		<div class="debug-tools">
			<h4>Debug Tools</h4>
			<div class="debug-buttons">
				<button 
					class="debug-btn"
					on:click={() => voiceClient.checkBackendConnectivity()}
					title="Check if backend is responding"
				>
					🌐 Check Backend
				</button>
				<button 
					class="debug-btn"
					on:click={() => voiceClient.debugState()}
					title="Show current voice state"
				>
					🐛 Debug State
				</button>
				<button 
					class="debug-btn"
					on:click={() => voiceClient.triggerRegistration()}
					title="Manually trigger registration"
				>
					🔄 Trigger Registration
				</button>
				<button 
					class="debug-btn"
					on:click={() => voiceClient.forceReRegistration()}
					title="Force re-registration"
				>
					🔄 Force Re-Register
				</button>
				<button 
					class="debug-btn"
					on:click={() => voiceClient.testReconnection()}
					title="Test reconnection"
				>
					🔄 Test Reconnection
				</button>
			</div>
		</div>
	{/if}

	<!-- Voice Settings Modal -->
	{#if showSettings}
		<div class="voice-settings-overlay" on:click={() => showSettings = false}>
			<div class="voice-settings-modal" on:click|stopPropagation>
				<div class="settings-header">
					<h3>Voice Settings</h3>
					<button on:click={() => showSettings = false} class="close-btn">×</button>
				</div>

				<div class="settings-content">
					<!-- Input Device -->
					<div class="setting-group">
						<label for="input-device">Input Device</label>
						<select 
							id="input-device"
							bind:value={voiceSettings.inputDevice}
							on:change={() => updateSetting('inputDevice', voiceSettings.inputDevice)}
						>
							{#each audioDevices.filter(d => d.kind === 'audioinput') as device}
								<option value={device.deviceId}>{device.label || `Microphone ${device.deviceId.slice(0, 8)}`}</option>
							{/each}
						</select>
					</div>

					<!-- Output Device -->
					<div class="setting-group">
						<label for="output-device">Output Device</label>
						<select 
							id="output-device"
							bind:value={voiceSettings.outputDevice}
							on:change={() => updateSetting('outputDevice', voiceSettings.outputDevice)}
						>
							{#each audioDevices.filter(d => d.kind === 'audiooutput') as device}
								<option value={device.deviceId}>{device.label || `Speaker ${device.deviceId.slice(0, 8)}`}</option>
							{/each}
						</select>
					</div>

					<!-- Input Volume -->
					<div class="setting-group">
						<label for="input-volume">Input Volume</label>
						<input 
							type="range" 
							id="input-volume"
							min="0" 
							max="100" 
							bind:value={voiceSettings.inputVolume}
							on:input={() => updateSetting('inputVolume', voiceSettings.inputVolume)}
						/>
						<span>{voiceSettings.inputVolume}%</span>
					</div>

					<!-- Output Volume -->
					<div class="setting-group">
						<label for="output-volume">Output Volume</label>
						<input 
							type="range" 
							id="output-volume"
							min="0" 
							max="100" 
							bind:value={voiceSettings.outputVolume}
							on:input={() => updateSetting('outputVolume', voiceSettings.outputVolume)}
						/>
						<span>{voiceSettings.outputVolume}%</span>
					</div>

					<!-- Audio Processing -->
					<div class="setting-group">
						<label>
							<input 
								type="checkbox" 
								bind:checked={voiceSettings.noiseSuppression}
								on:change={() => updateSetting('noiseSuppression', voiceSettings.noiseSuppression)}
							/>
							Noise Suppression
						</label>
					</div>

					<div class="setting-group">
						<label>
							<input 
								type="checkbox" 
								bind:checked={voiceSettings.echoCancellation}
								on:change={() => updateSetting('echoCancellation', voiceSettings.echoCancellation)}
							/>
							Echo Cancellation
						</label>
					</div>

					<div class="setting-group">
						<label>
							<input 
								type="checkbox" 
								bind:checked={voiceSettings.autoGainControl}
								on:change={() => updateSetting('autoGainControl', voiceSettings.autoGainControl)}
							/>
							Auto Gain Control
						</label>
					</div>

					<!-- Voice Activity Detection -->
					<div class="setting-group">
						<label>
							<input 
								type="checkbox" 
								bind:checked={voiceSettings.voiceActivityDetection}
								on:change={() => updateSetting('voiceActivityDetection', voiceSettings.voiceActivityDetection)}
							/>
							Voice Activity Detection
						</label>
					</div>

					<!-- Push to Talk -->
					<div class="setting-group">
						<label>
							<input 
								type="checkbox" 
								bind:checked={voiceSettings.pushToTalk}
								on:change={() => updateSetting('pushToTalk', voiceSettings.pushToTalk)}
							/>
							Push to Talk
						</label>
					</div>

					{#if voiceSettings.pushToTalk}
						<div class="setting-group">
							<label for="push-to-talk-key">Push to Talk Key</label>
							<select 
								id="push-to-talk-key"
								bind:value={voiceSettings.pushToTalkKey}
								on:change={() => updateSetting('pushToTalkKey', voiceSettings.pushToTalkKey)}
							>
								<option value="Space">Space</option>
								<option value="C">C</option>
								<option value="V">V</option>
								<option value="B">B</option>
								<option value="N">N</option>
							</select>
						</div>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.voice-controls {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
	}

	.voice-status {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.status-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--font-size-sm);
	}

	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: currentColor;
	}

	.voice-buttons {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
	}

	.voice-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		height: 40px;
		border: none;
		border-radius: var(--radius-md);
		background: var(--color-primary);
		color: var(--color-text);
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
	}

	.voice-btn:hover:not(:disabled) {
		background: var(--color-accent);
		transform: translateY(-1px);
	}

	.voice-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.voice-btn.muted {
		background: var(--color-error);
	}

	.voice-btn.deafened {
		background: var(--color-error);
	}

	.voice-btn.speaking {
		background: var(--color-success);
		animation: pulse 1s infinite;
	}

	.voice-btn.settings {
		background: var(--color-primary);
	}

	.voice-btn.disconnect {
		background: var(--color-error);
	}

	.voice-btn.connect {
		background: var(--color-success);
	}

	.loading-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid transparent;
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.voice-error {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.5rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		color: var(--color-error);
	}

	.error-close {
		background: none;
		border: none;
		color: inherit;
		cursor: pointer;
		font-size: 1.2rem;
		padding: 0;
		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.debug-tools {
		margin-top: 1rem;
		padding: 0.5rem;
		background: var(--color-surface-light);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
	}

	.debug-tools h4 {
		margin-top: 0;
		margin-bottom: 0.5rem;
		color: var(--color-text);
		font-size: var(--font-size-md);
	}

	.debug-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.debug-btn {
		padding: 0.3rem 0.7rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-primary);
		color: var(--color-text);
		cursor: pointer;
		transition: all 0.2s ease;
		font-size: var(--font-size-sm);
	}

	.debug-btn:hover {
		background: var(--color-accent);
		border-color: var(--color-accent);
	}

	.debug-btn.always-visible {
		margin-top: 0.5rem;
		width: 100%;
		justify-content: center;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		color: var(--color-text-muted);
	}

	.debug-btn.always-visible:hover {
		background: var(--color-primary);
		color: var(--color-text);
	}

	.debug-btn.force-disconnect {
		background: var(--color-error);
		color: var(--color-text);
	}

	.debug-btn.force-disconnect:hover {
		background: var(--color-error-dark);
	}

	.voice-settings-overlay {
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

	.voice-settings-modal {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		max-width: 400px;
		width: 90%;
		max-height: 80vh;
		overflow-y: auto;
	}

	.settings-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid var(--color-border);
	}

	.settings-header h3 {
		margin: 0;
		color: var(--color-text);
		font-size: var(--font-size-lg);
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--color-text-muted);
		cursor: pointer;
		font-size: 1.5rem;
		padding: 0;
		width: 30px;
		height: 30px;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		color: var(--color-text);
	}

	.settings-content {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.setting-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.setting-group label {
		color: var(--color-text);
		font-size: var(--font-size-sm);
		font-weight: 500;
	}

	.setting-group select,
	.setting-group input[type="range"] {
		padding: 0.5rem;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		background: var(--color-primary);
		color: var(--color-text);
		font-size: var(--font-size-sm);
	}

	.setting-group input[type="checkbox"] {
		margin-right: 0.5rem;
	}

	.setting-group span {
		color: var(--color-text-muted);
		font-size: var(--font-size-sm);
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style> 