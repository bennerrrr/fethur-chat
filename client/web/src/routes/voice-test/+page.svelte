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

			// Join test voice channel (channel ID 3 is our voice channel)
			await voiceClient.joinChannel(3, 1);

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
		background: var(--color-bg);
		color: var(--color-text);
		padding: 2rem;
		font-family: var(--font-family);
	}

	.test-container {
		max-width: 800px;
		margin: 0 auto;
	}

	h1 {
		font-size: var(--font-size-3xl);
		margin-bottom: 0.5rem;
		color: var(--color-text);
		text-align: center;
	}

	.test-container > p {
		text-align: center;
		color: var(--color-text-muted);
		margin-bottom: 2rem;
	}

	.notice-section {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		text-align: center;
	}

	.notice-section h2 {
		font-size: var(--font-size-xl);
		margin-bottom: 0.5rem;
		color: var(--color-text);
	}

	.notice-section p {
		color: var(--color-text-muted);
		margin-bottom: 1rem;
	}

	.notice-section ul {
		list-style: none;
		padding: 0;
		margin-bottom: 1rem;
	}

	.notice-section li {
		margin-bottom: 0.5rem;
		color: var(--color-text-muted);
	}

	.notice-section strong {
		color: var(--color-text);
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
		background: var(--color-primary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		text-align: center;
	}

	.warning-box {
		padding: 1rem;
		background: rgba(245, 158, 11, 0.1);
		border: 1px solid #f59e0b;
		border-radius: var(--radius-md);
		margin-top: 1rem;
	}

	.warning-box p {
		margin: 0;
		color: #f59e0b;
	}

	.test-section {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		padding: 1.5rem;
		margin-bottom: 1.5rem;
	}

	.test-section h2 {
		font-size: var(--font-size-xl);
		margin-bottom: 0.5rem;
		color: var(--color-text);
	}

	.test-section p {
		color: var(--color-text-muted);
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
		border-radius: var(--radius-md);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s ease;
		text-decoration: none;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.btn-primary {
		background: var(--color-accent);
		color: white;
	}

	.btn-primary:hover {
		background: var(--color-accent-hover);
		transform: translateY(-1px);
	}

	.btn-secondary {
		background: var(--color-primary);
		color: var(--color-text);
		border: 1px solid var(--color-border);
	}

	.btn-secondary:hover {
		background: var(--color-accent);
		color: white;
		transform: translateY(-1px);
	}

	.status-success {
		padding: 0.75rem;
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid var(--color-success);
		border-radius: var(--radius-md);
		color: var(--color-success);
		font-weight: 500;
	}

	.error-message {
		padding: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid var(--color-error);
		border-radius: var(--radius-md);
		color: var(--color-error);
		margin-bottom: 1rem;
	}

	.devices-list h3 {
		font-size: var(--font-size-lg);
		margin: 1rem 0 0.5rem 0;
		color: var(--color-text);
	}

	.device-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem;
		background: var(--color-primary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
		margin-bottom: 0.5rem;
	}

	.device-name {
		font-weight: 500;
		color: var(--color-text);
	}

	.device-id {
		font-size: var(--font-size-sm);
		color: var(--color-text-muted);
		font-family: monospace;
	}

	.navigation {
		text-align: center;
		margin-top: 2rem;
	}
</style> 