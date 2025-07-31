<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { voiceClient } from '$lib/webrtc/voice';
	import { authStore } from '$lib/stores/auth';
	import { goto } from '$app/navigation';

	let isConnected = false;
	let isStreamActive = false;
	let error = '';
	let localStream: MediaStream | null = null;
	let audioDevices: MediaDeviceInfo[] = [];
	let isHttps = false;

	onMount(async () => {
		// Check authentication
		if (!$authStore.token) {
			goto('/');
			return;
		}

		// Check if we're running over HTTPS
		isHttps = window.location.protocol === 'https:';

		// Load audio devices
		try {
			await loadAudioDevices();
		} catch (err) {
			console.error('Failed to load audio devices:', err);
		}
	});

	async function testMicrophone() {
		try {
			error = '';
			
			// Check if MediaDevices API is available
			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
				error = 'MediaDevices API not available. This usually means:\n\n1. You need to use HTTPS (not HTTP)\n2. Your browser doesn\'t support this feature\n3. Microphone permissions are blocked\n\nTry accessing the site via HTTPS or check your browser settings.';
				return;
			}

			localStream = await navigator.mediaDevices.getUserMedia({
				audio: {
					noiseSuppression: true,
					echoCancellation: true,
					autoGainControl: true
				},
				video: false
			});
			isStreamActive = true;
		} catch (err: any) {
			if (err.name === 'NotAllowedError') {
				error = 'Microphone access denied. Please allow microphone permissions in your browser settings and try again.';
			} else if (err.name === 'NotFoundError') {
				error = 'No microphone found. Please connect a microphone and try again.';
			} else if (err.name === 'NotSupportedError') {
				error = 'Your browser doesn\'t support microphone access. Please try a different browser.';
			} else {
				error = err.message || 'Failed to access microphone';
			}
			console.error('Microphone error:', err);
		}
	}

	async function stopMicrophone() {
		if (localStream) {
			localStream.getTracks().forEach(track => track.stop());
			localStream = null;
			isStreamActive = false;
		}
	}

	async function testVoiceConnection() {
		try {
			error = '';
			const token = $authStore.token;
			if (!token) {
				error = 'Not authenticated';
				return;
			}

			// Connect to voice server
			await voiceClient.connect(token);
			isConnected = true;

			// Start local stream
			await voiceClient.startLocalStream();

			// Join test voice channel (channel ID 2 is our voice channel)
			await voiceClient.joinChannel(2, 1);

		} catch (err: any) {
			error = err.message || 'Failed to connect to voice server';
			console.error('Voice connection error:', err);
		}
	}

	async function disconnectVoice() {
		try {
			await voiceClient.disconnect();
			isConnected = false;
		} catch (err) {
			console.error('Disconnect error:', err);
		}
	}

	async function testSpeaking() {
		try {
			console.log('Testing speaking functionality...');
			voiceClient.testSpeaking();
		} catch (err) {
			console.error('Test speaking error:', err);
		}
	}

	async function testWebRTCConnection() {
		try {
			console.log('Testing WebRTC connection...');
			await voiceClient.testWebRTCConnection();
		} catch (err) {
			console.error('Test WebRTC connection error:', err);
		}
	}

	async function forceDisconnect() {
		try {
			console.log('Force disconnecting...');
			voiceClient.forceDisconnect();
			isConnected = false;
			console.log('Force disconnect completed');
		} catch (err) {
			console.error('Force disconnect error:', err);
		}
	}

	async function testReconnection() {
		try {
			console.log('Testing reconnection...');
			await voiceClient.testReconnection();
		} catch (err) {
			console.error('Test reconnection error:', err);
		}
	}

	async function checkRegistration() {
		try {
			console.log('Checking registration...');
			await voiceClient.checkAndFixRegistration();
		} catch (err) {
			console.error('Check registration error:', err);
		}
	}

	async function debugState() {
		try {
			console.log('Debugging state...');
			await voiceClient.debugState();
		} catch (err) {
			console.error('Debug state error:', err);
		}
	}

	async function forceReRegistration() {
		try {
			console.log('Force re-registering...');
			await voiceClient.forceReRegistration();
		} catch (err) {
			console.error('Force re-registration error:', err);
		}
	}

	async function triggerRegistration() {
		try {
			console.log('Triggering registration...');
			await voiceClient.triggerRegistration();
		} catch (err) {
			console.error('Trigger registration error:', err);
		}
	}

	async function checkConnectivity() {
		try {
			console.log('Checking connectivity...');
			await voiceClient.checkBackendConnectivity();
		} catch (err) {
			console.error('Check connectivity error:', err);
		}
	}

	async function loadAudioDevices() {
		try {
			// Check if MediaDevices API is available
			if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
				console.warn('MediaDevices API not available');
				return;
			}

			audioDevices = await voiceClient.getAudioDevices();
		} catch (err) {
			console.error('Failed to load audio devices:', err);
		}
	}

	onDestroy(() => {
		stopMicrophone();
		disconnectVoice();
	});
</script>

<svelte:head>
	<title>Voice Test - Fethur</title>
</svelte:head>

<div class="voice-test-page">
	<div class="test-container">
		<h1>🎤 Voice Test</h1>
		<p>Test the voice functionality before using it in chat</p>

		<!-- Important Notice -->
		<div class="notice-section">
			<h2>⚠️ Important Requirements</h2>
			<p>Voice chat requires:</p>
			<ul>
				<li><strong>HTTPS Connection:</strong> Voice features only work over secure connections</li>
				<li><strong>Microphone Permission:</strong> Your browser must allow microphone access</li>
				<li><strong>Modern Browser:</strong> Chrome, Firefox, Safari, or Edge (latest versions)</li>
			</ul>
			<div class="status-grid">
				<p><strong>HTTPS Status:</strong> 
					{#if isHttps}
						✅ Secure Connection
					{:else}
						❌ HTTP Connection (Voice features may not work)
					{/if}
				</p>
				<p><strong>MediaDevices API:</strong> 
					{#if typeof navigator !== 'undefined' && navigator.mediaDevices}
						✅ Available
					{:else}
						❌ Not Available
					{/if}
				</p>
			</div>
			{#if !isHttps}
				<div class="warning-box">
					<p><strong>⚠️ Warning:</strong> You're not using HTTPS. Voice features may not work properly. Consider accessing the site via HTTPS.</p>
				</div>
			{/if}
		</div>

		<!-- Microphone Test -->
		<div class="test-section">
			<h2>Microphone Test</h2>
			<p>Test your microphone access and audio settings</p>
			
			<div class="test-buttons">
				{#if !isStreamActive}
					<button class="btn-primary" on:click={testMicrophone}>
						🎤 Test Microphone
					</button>
				{:else}
					<button class="btn-secondary" on:click={stopMicrophone}>
						🔇 Stop Microphone
					</button>
				{/if}
			</div>

			{#if isStreamActive}
				<div class="status-success">
					✅ Microphone is active and working
				</div>
			{/if}
		</div>

		<!-- Voice Connection Test -->
		<div class="test-section">
			<h2>Voice Server Test</h2>
			<p>Test connection to the voice server and WebRTC functionality</p>
			
			<div class="test-buttons">
				{#if !isConnected}
					<button class="btn-primary" on:click={testVoiceConnection}>
						🔗 Connect to Voice Server
					</button>
				{:else}
					<button class="btn-secondary" on:click={disconnectVoice}>
						🔌 Disconnect
					</button>
					<button class="btn-secondary" on:click={testSpeaking}>
						🎤 Test Speaking
					</button>
					<button class="btn-secondary" on:click={testWebRTCConnection}>
						🌐 Test WebRTC Connection
					</button>
					<button class="btn-secondary" on:click={forceDisconnect}>
						🚫 Force Disconnect
					</button>
					<button class="btn-secondary" on:click={testReconnection}>
						🔄 Test Reconnection
					</button>
					<button class="btn-secondary" on:click={checkRegistration}>
						🔄 Check Registration
					</button>
					<button class="btn-secondary" on:click={debugState}>
						🐛 Debug State
					</button>
					<button class="btn-secondary" on:click={forceReRegistration}>
						🔄 Force Re-Registration
					</button>
					<button class="btn-secondary" on:click={triggerRegistration}>
						🔄 Trigger Registration
					</button>
					<button class="btn-secondary" on:click={checkConnectivity}>
						🌐 Check Backend Connectivity
					</button>
				{/if}
			</div>

			{#if isConnected}
				<div class="status-success">
					✅ Connected to voice server
				</div>
			{/if}
		</div>

		<!-- Audio Devices -->
		<div class="test-section">
			<h2>Audio Devices</h2>
			<p>Available input and output devices</p>
			
			<div class="devices-list">
				<h3>Input Devices:</h3>
				{#each audioDevices.filter(d => d.kind === 'audioinput') as device}
					<div class="device-item">
						<span class="device-name">{device.label || `Microphone ${device.deviceId.slice(0, 8)}`}</span>
						<span class="device-id">{device.deviceId}</span>
					</div>
				{/each}

				<h3>Output Devices:</h3>
				{#each audioDevices.filter(d => d.kind === 'audiooutput') as device}
					<div class="device-item">
						<span class="device-name">{device.label || `Speaker ${device.deviceId.slice(0, 8)}`}</span>
						<span class="device-id">{device.deviceId}</span>
					</div>
				{/each}
			</div>
		</div>

		<!-- Error Display -->
		{#if error}
			<div class="error-message">
				❌ {error}
			</div>
		{/if}

		<!-- Navigation -->
		<div class="navigation">
			<a href="/chat" class="btn-secondary">← Back to Chat</a>
		</div>
	</div>
</div>

<style>
	.voice-test-page {
		min-height: 100vh;
		background: var(--color-bg, #1a1a1a);
		color: var(--color-text, #ffffff);
		padding: 2rem;
		font-family: var(--font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
	}

	.test-container {
		max-width: 800px;
		margin: 0 auto;
	}

	h1 {
		font-size: var(--font-size-3xl, 2rem);
		margin-bottom: 0.5rem;
		color: var(--color-text, #ffffff);
		text-align: center;
	}

	.test-container > p {
		text-align: center;
		color: var(--color-text-muted, #888);
		margin-bottom: 2rem;
	}

	.notice-section {
		background: var(--color-surface, #2d2d2d);
		border: 1px solid var(--color-border, #404040);
		border-radius: var(--radius-lg, 8px);
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.notice-section h2 {
		font-size: var(--font-size-xl, 1.25rem);
		margin-bottom: 0.5rem;
		color: var(--color-text, #ffffff);
	}

	.notice-section p {
		color: var(--color-text-muted, #888);
		margin-bottom: 1rem;
	}

	.notice-section ul {
		list-style: none;
		padding: 0;
		margin-bottom: 1rem;
	}

	.notice-section li {
		margin-bottom: 0.5rem;
		color: var(--color-text-muted, #888);
	}

	.notice-section strong {
		color: var(--color-text, #ffffff);
	}

	.status-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.status-grid p {
		margin: 0;
		padding: 0.5rem;
		background: var(--color-primary, #2d2d2d);
		border: 1px solid var(--color-border, #404040);
		border-radius: var(--radius-sm, 4px);
		text-align: center;
	}

	.warning-box {
		padding: 1rem;
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid #f59e0b;
		border-radius: var(--radius-md, 6px);
		margin-top: 1rem;
	}

	.warning-box p {
		margin: 0;
		color: #f59e0b;
	}

	.test-section {
		background: var(--color-surface, #2d2d2d);
		border: 1px solid var(--color-border, #404040);
		border-radius: var(--radius-lg, 8px);
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.test-section h2 {
		font-size: var(--font-size-xl, 1.25rem);
		margin-bottom: 0.5rem;
		color: var(--color-text, #ffffff);
	}

	.test-section p {
		color: var(--color-text-muted, #888);
		margin-bottom: 1rem;
	}

	.test-buttons {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.btn-primary, .btn-secondary {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: var(--radius-md, 6px);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-primary {
		background: var(--color-accent, #3b82f6);
		color: white;
	}

	.btn-primary:hover {
		background: var(--color-accent-hover, #2563eb);
		transform: translateY(-1px);
	}

	.btn-secondary {
		background: var(--color-primary, #2d2d2d);
		color: var(--color-text, #ffffff);
		border: 1px solid var(--color-border, #404040);
	}

	.btn-secondary:hover {
		background: var(--color-accent, #3b82f6);
		color: white;
		transform: translateY(-1px);
	}

	.status-success {
		padding: 0.75rem;
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid var(--color-success, #10b981);
		border-radius: var(--radius-md, 6px);
		color: var(--color-success, #10b981);
		font-weight: 500;
	}

	.error-message {
		padding: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--color-error, #ef4444);
		border-radius: var(--radius-md, 6px);
		color: var(--color-error, #ef4444);
		margin-bottom: 1rem;
	}

	.devices-list h3 {
		font-size: var(--font-size-lg, 1.125rem);
		margin: 1rem 0 0.5rem 0;
		color: var(--color-text, #ffffff);
	}

	.device-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		background: var(--color-primary, #2d2d2d);
		border: 1px solid var(--color-border, #404040);
		border-radius: var(--radius-sm, 4px);
		margin-bottom: 0.5rem;
	}

	.device-name {
		font-weight: 500;
		color: var(--color-text, #ffffff);
	}

	.device-id {
		font-size: var(--font-size-sm, 0.875rem);
		color: var(--color-text-muted, #888);
		font-family: monospace;
	}

	.navigation {
		text-align: center;
		margin-top: 2rem;
	}
</style> 