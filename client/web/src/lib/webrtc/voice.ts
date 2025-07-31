import { writable, type Writable } from 'svelte/store';

export interface VoiceState {
	isConnected: boolean;
	isRegistered: boolean;
	isMuted: boolean;
	isDeafened: boolean;
	isSpeaking: boolean;
	currentChannelId: number | null;
	peers: Map<string, RTCPeerConnection>;
	localStream: MediaStream | null;
	remoteStreams: Map<string, MediaStream>;
	connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

export interface VoiceSettings {
	inputDevice: string;
	outputDevice: string;
	inputVolume: number;
	outputVolume: number;
	noiseSuppression: boolean;
	echoCancellation: boolean;
	autoGainControl: boolean;
	voiceActivityDetection: boolean;
	pushToTalk: boolean;
	pushToTalkKey: string;
}

export interface VoicePeer {
	userId: number;
	username: string;
	isMuted: boolean;
	isDeafened: boolean;
	isSpeaking: boolean;
	connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

class VoiceClient {
	private ws: WebSocket | null = null;
	private state: Writable<VoiceState>;
	private settings: Writable<VoiceSettings>;
	private peers: Map<string, RTCPeerConnection> = new Map();
	private localStream: MediaStream | null = null;
	private remoteStreams: Map<string, MediaStream> = new Map();
	private voiceActivityDetector: any = null;
	private speakingTimeout: number | null = null;
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 1000;

	constructor() {
		this.state = writable<VoiceState>({
			isConnected: false,
			isRegistered: false,
			isMuted: false,
			isDeafened: false,
			isSpeaking: false,
			currentChannelId: null,
			peers: new Map(),
			localStream: null,
			remoteStreams: new Map(),
			connectionQuality: 'disconnected'
		});

		this.settings = writable<VoiceSettings>({
			inputDevice: '',
			outputDevice: '',
			inputVolume: 100,
			outputVolume: 100,
			noiseSuppression: true,
			echoCancellation: true,
			autoGainControl: true,
			voiceActivityDetection: true,
			pushToTalk: false,
			pushToTalkKey: 'Space'
		});

		// Load settings from localStorage
		this.loadSettings();
	}

	get stateStore() {
		return this.state;
	}

	get settingsStore() {
		return this.settings;
	}

	private loadSettings() {
		if (typeof window !== 'undefined') {
			const saved = localStorage.getItem('voice-settings');
			if (saved) {
				try {
					const parsed = JSON.parse(saved);
					let currentSettings: VoiceSettings;
					this.settings.subscribe(s => currentSettings = s)();
					this.settings.set({ ...currentSettings!, ...parsed });
				} catch (e) {
					console.error('Failed to load voice settings:', e);
				}
			}
		}
	}

	private saveSettings() {
		if (typeof window !== 'undefined') {
			let settings: VoiceSettings;
			this.settings.subscribe(s => settings = s)();
			localStorage.setItem('voice-settings', JSON.stringify(settings));
		}
	}

	getState(): VoiceState {
		let state: VoiceState;
		this.state.subscribe(s => state = s)();
		return state!;
	}

	getSettings(): VoiceSettings {
		let settings: VoiceSettings;
		this.settings.subscribe(s => settings = s)();
		return settings!;
	}

	async connect(token: string, serverUrl: string = ''): Promise<void> {
		if (this.ws?.readyState === WebSocket.OPEN) {
			return;
		}

		try {
			console.log('Connecting to voice WebSocket...');
			console.log('Token length:', token.length);
			console.log('Server URL:', serverUrl);
			
			// Use relative URL in browser to leverage Vite's proxy
			const wsUrl = typeof window !== 'undefined' ? `/voice?token=${encodeURIComponent(token)}` : `${serverUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/voice?token=${encodeURIComponent(token)}`;
			console.log('Connecting to voice WebSocket:', wsUrl);
			
			// Add connection timeout
			const connectionTimeout = setTimeout(() => {
				if (this.ws?.readyState === WebSocket.CONNECTING) {
					console.error('Voice WebSocket connection timeout');
					this.ws.close();
				}
			}, 10000); // 10 second timeout
			
			this.ws = new WebSocket(wsUrl);
			
			// Wait for connection to be established
			await new Promise<void>((resolve, reject) => {
				this.ws!.onopen = () => {
					console.log('Voice WebSocket connected successfully');
					clearTimeout(connectionTimeout);
					this.state.update(s => ({ ...s, isConnected: true, connectionQuality: 'excellent' }));
					this.reconnectAttempts = 0;
					resolve();
				};

				this.ws!.onerror = (error) => {
					console.error('Voice WebSocket error:', error);
					clearTimeout(connectionTimeout);
					this.state.update(s => ({ ...s, connectionQuality: 'poor' }));
					reject(error);
				};

				this.ws!.onclose = (event) => {
					console.log('Voice WebSocket disconnected:', event.code, event.reason);
					clearTimeout(connectionTimeout);
					this.state.update(s => ({ ...s, isConnected: false, connectionQuality: 'disconnected' }));
					this.handleDisconnect();
					reject(new Error(`WebSocket closed: ${event.code} ${event.reason}`));
				};
			});

			// Set up message handler after connection is established
			this.ws.onmessage = (event) => {
				console.log('Voice WebSocket message received:', event.data);
				try {
					const data = JSON.parse(event.data);
					this.handleMessage(data);
				} catch (error) {
					console.error('Failed to parse voice message:', error);
				}
			};

		} catch (error) {
			console.error('Failed to connect to voice server:', error);
			throw error;
		}
	}

	private handleDisconnect() {
		// Clean up all peer connections
		this.peers.forEach(peer => {
			peer.close();
		});
		this.peers.clear();
		this.remoteStreams.clear();

		// Reset state
		this.state.update(s => ({
			...s,
			isConnected: false,
			isRegistered: false,
			connectionQuality: 'disconnected'
		}));

		// Attempt to reconnect
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			setTimeout(() => {
				// Reconnect logic would go here
				console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
			}, this.reconnectDelay * this.reconnectAttempts);
		}
	}

	private handleMessage(message: any) {
		console.log('Voice message received:', message);

		switch (message.type) {
			case 'connected':
				this.handleConnected(message);
				break;
			case 'channel-joined':
				this.handleChannelJoined(message);
				break;
			case 'user-joined':
				this.handleUserJoined(message);
				break;
			case 'user-left':
				this.handleUserLeft(message);
				break;
			case 'offer':
				this.handleOffer(message);
				break;
			case 'answer':
				this.handleAnswer(message);
				break;
			case 'ice-candidate':
				this.handleIceCandidate(message);
				break;
			case 'mute':
			case 'unmute':
			case 'deafen':
			case 'undeafen':
				this.handleVoiceStateChange(message);
				break;
			case 'speaking':
				this.handleSpeaking(message);
				break;
			case 'ping':
				// Respond to ping with pong
				this.sendMessage({
					type: 'pong',
					timestamp: new Date().toISOString()
				});
				break;
			case 'pong':
				// Handle pong response
				break;
			default:
				console.warn('Unknown voice message type:', message.type);
		}
	}

	private handleConnected(message: any) {
		console.log('Connected to voice server');
		// Mark as fully registered and ready to join channels
		this.state.update(s => ({ ...s, isRegistered: true }));
	}

	private async handleChannelJoined(message: any) {
		console.log('Received channel-joined message:', message);
		const { channel_id, server_id, channel_name, clients } = message.data;
		
		this.state.update(s => ({
			...s,
			currentChannelId: channel_id
		}));

		console.log(`Joined voice channel: ${channel_name} (${channel_id})`);
		console.log('Current state after joining:', this.getState());
		
		// Initialize peer connections for existing clients and create offers
		for (const client of clients) {
			if (client.user_id !== message.user_id) {
				const peer = this.createPeerConnection(client.user_id.toString());
				
				// If we have a local stream, create and send an offer
				if (this.localStream) {
					try {
						const offer = await peer.createOffer();
						await peer.setLocalDescription(offer);
						
						this.sendMessage({
							type: 'offer',
							target_id: client.user_id,
							data: offer
						});
					} catch (error) {
						console.error('Error creating offer for existing client:', error);
					}
				}
			}
		}
	}

	private async handleUserJoined(message: any) {
		const peerId = message.user_id.toString();
		const peer = this.createPeerConnection(peerId);
		
		// If we have a local stream, create and send an offer
		if (this.localStream) {
			try {
				const offer = await peer.createOffer();
				await peer.setLocalDescription(offer);
				
				this.sendMessage({
					type: 'offer',
					target_id: message.user_id,
					data: offer
				});
			} catch (error) {
				console.error('Error creating offer:', error);
			}
		}
	}

	private handleUserLeft(message: any) {
		const peerId = message.user_id.toString();
		this.removePeerConnection(peerId);
	}

	private async handleOffer(message: any) {
		const peerId = message.user_id.toString();
		let peer = this.peers.get(peerId);
		
		// Create peer connection if it doesn't exist
		if (!peer) {
			console.log('Creating peer connection for incoming offer from:', peerId);
			peer = this.createPeerConnection(peerId);
		}

		try {
			console.log('Setting remote description for offer from:', peerId);
			await peer.setRemoteDescription(new RTCSessionDescription(message.data));
			const answer = await peer.createAnswer();
			await peer.setLocalDescription(answer);
			
			console.log('Sending answer to:', peerId);
			this.sendMessage({
				type: 'answer',
				target_id: message.user_id,
				data: answer
			});
		} catch (error) {
			console.error('Error handling offer:', error);
		}
	}

	private async handleAnswer(message: any) {
		const peerId = message.user_id.toString();
		const peer = this.peers.get(peerId);
		
		if (!peer) {
			console.warn('Received answer for unknown peer:', peerId);
			return;
		}

		try {
			console.log(`Setting remote description (answer) for peer ${peerId}`);
			await peer.setRemoteDescription(new RTCSessionDescription(message.data));
		} catch (error) {
			console.error('Error handling answer:', error);
		}
	}

	private async handleIceCandidate(message: any) {
		const peerId = message.user_id.toString();
		const peer = this.peers.get(peerId);
		
		if (!peer) {
			console.warn('Received ICE candidate for unknown peer:', peerId);
			return;
		}

		try {
			console.log(`Adding ICE candidate from peer ${peerId}:`, message.data.type);
			await peer.addIceCandidate(new RTCIceCandidate(message.data));
		} catch (error) {
			console.error('Error handling ICE candidate:', error);
		}
	}

	private handleVoiceStateChange(message: any) {
		// Update peer state
		const peerId = message.user_id.toString();
		// This would update the peer's mute/deafen state in the UI
		console.log(`Peer ${message.username} ${message.type}`);
	}

	private handleSpeaking(message: any) {
		const peerId = message.user_id.toString();
		const isSpeaking = message.data;
		
		// Update peer speaking state in the UI
		console.log(`Peer ${message.username} ${isSpeaking ? 'started' : 'stopped'} speaking`);
	}

	private sendMessage(message: any) {
		console.log('Sending voice message:', message);
		if (this.ws?.readyState === WebSocket.OPEN) {
			const messageStr = JSON.stringify(message);
			console.log('Sending WebSocket message:', messageStr);
			try {
				this.ws.send(messageStr);
				console.log('Voice message sent successfully');
			} catch (error) {
				console.error('Failed to send voice message:', error);
			}
		} else {
			console.warn('Voice WebSocket not connected. State:', this.ws?.readyState);
		}
	}

	async joinChannel(channelId: number, serverId: number): Promise<void> {
		console.log('Attempting to join voice channel:', channelId, 'server:', serverId);
		console.log('WebSocket state:', this.ws?.readyState);
		
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			console.error('Voice WebSocket not connected. State:', this.ws?.readyState);
			throw new Error('Voice WebSocket not connected');
		}

		// Wait for registration to complete
		let state = this.getState();
		if (!state.isRegistered) {
			console.log('Waiting for registration to complete...');
			await new Promise<void>((resolve) => {
				const unsubscribe = this.state.subscribe((s) => {
					if (s.isRegistered) {
						unsubscribe();
						resolve();
					}
				});
				
				// Timeout after 5 seconds
				setTimeout(() => {
					unsubscribe();
					resolve();
				}, 5000);
			});
		}

		// Start local stream first if not already started
		if (!this.localStream) {
			console.log('Starting local stream...');
			await this.startLocalStream();
		}

		console.log('Sending join-channel message...');
		const joinMessage = {
			type: 'join-channel',
			channel_id: channelId,
			server_id: serverId
		};
		console.log('Join message:', joinMessage);
		this.sendMessage(joinMessage);
		console.log('Join message sent successfully');
	}

	async leaveChannel(): Promise<void> {
		const state = this.getState();
		if (!state.currentChannelId) {
			console.log('No channel to leave');
			return;
		}

		console.log('Leaving voice channel:', state.currentChannelId);

		// Stop voice activity detection first to prevent further speaking messages
		this.cleanupVoiceActivityDetection();

		// Send leave message to server if WebSocket is still open
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.sendMessage({
				type: 'leave-channel',
				channel_id: state.currentChannelId
			});
		}

		// Clean up peer connections
		this.peers.forEach((peer, peerId) => {
			console.log('Closing peer connection:', peerId);
			peer.close();
			// Remove audio element for this peer
			const audioElement = document.getElementById(`remote-audio-${peerId}`);
			if (audioElement) {
				audioElement.remove();
			}
		});
		this.peers.clear();
		this.remoteStreams.clear();

		// Stop local stream
		if (this.localStream) {
			this.localStream.getTracks().forEach(track => {
				console.log('Stopping local audio track');
				track.stop();
			});
			this.localStream = null;
		}

		// Update state
		this.state.update(s => ({
			...s,
			currentChannelId: null,
			peers: new Map(),
			remoteStreams: new Map(),
			localStream: null,
			isSpeaking: false,
			isConnected: false
		}));

		console.log('Successfully left voice channel');
	}

	async startLocalStream(): Promise<MediaStream | null> {
		try {
			// Check if MediaDevices API is available
			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
				throw new Error('MediaDevices API not available. Please use HTTPS or grant microphone permissions.');
			}

			const settings = this.getSettings();
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					noiseSuppression: settings.noiseSuppression,
					echoCancellation: settings.echoCancellation,
					autoGainControl: settings.autoGainControl
				},
				video: false
			});

			this.localStream = stream;
			this.state.update(s => ({ ...s, localStream: stream }));

			// Start voice activity detection if enabled
			if (settings.voiceActivityDetection) {
				this.setupVoiceActivityDetection(stream);
			}

			console.log('✅ Local audio stream started successfully');
			return stream;
		} catch (error) {
			console.error('Failed to start local stream:', error);
			throw error;
		}
	}

	private setupVoiceActivityDetection(stream: MediaStream) {
		if (!window.AudioContext && !(window as any).webkitAudioContext) {
			console.warn('AudioContext not supported, voice activity detection disabled');
			return;
		}

		const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
		const analyser = audioContext.createAnalyser();
		const microphone = audioContext.createMediaStreamSource(stream);
		const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

		analyser.smoothingTimeConstant = 0.8;
		analyser.fftSize = 1024;

		microphone.connect(analyser);
		analyser.connect(scriptProcessor);
		scriptProcessor.connect(audioContext.destination);

		const dataArray = new Uint8Array(analyser.frequencyBinCount);

		scriptProcessor.onaudioprocess = () => {
			analyser.getByteFrequencyData(dataArray);
			
			// Calculate average volume
			const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
			
			// Threshold for voice activity (adjust as needed)
			const threshold = 30;
			const isSpeaking = average > threshold;

			if (isSpeaking !== this.getState().isSpeaking) {
				this.setSpeaking(isSpeaking);
			}
		};

		this.voiceActivityDetector = { audioContext, analyser, microphone, scriptProcessor };
	}

	private cleanupVoiceActivityDetection() {
		// Clear speaking timeout
		if (this.speakingTimeout) {
			clearTimeout(this.speakingTimeout);
			this.speakingTimeout = null;
		}

		// Clean up voice activity detector
		if (this.voiceActivityDetector) {
			try {
				this.voiceActivityDetector.scriptProcessor.disconnect();
				this.voiceActivityDetector.microphone.disconnect();
				this.voiceActivityDetector.audioContext.close();
			} catch (error) {
				console.warn('Error cleaning up voice activity detection:', error);
			}
			this.voiceActivityDetector = null;
		}

		// Reset speaking state
		this.state.update(s => ({ ...s, isSpeaking: false }));
	}

	private playRemoteAudio(stream: MediaStream, peerId: string) {
		try {
			// Create audio element for this peer
			const audio = document.createElement('audio');
			audio.id = `remote-audio-${peerId}`;
			audio.autoplay = true;
			audio.playsInline = true;
			
			// Set the stream as the audio source
			audio.srcObject = stream;
			
			// Add to DOM (hidden)
			audio.style.display = 'none';
			document.body.appendChild(audio);
			
			// Handle audio play errors
			audio.onerror = (error) => {
				console.error('Error playing remote audio for peer', peerId, ':', error);
			};
			
			// Handle audio play success
			audio.onplay = () => {
				console.log('Successfully playing remote audio for peer:', peerId);
			};
			
			// Handle audio ended
			audio.onended = () => {
				console.log('Remote audio ended for peer:', peerId);
				// Remove audio element
				if (audio.parentNode) {
					audio.parentNode.removeChild(audio);
				}
			};
			
			// Handle audio load start
			audio.onloadstart = () => {
				console.log('Audio loading started for peer:', peerId);
			};
			
			// Handle audio can play
			audio.oncanplay = () => {
				console.log('Audio can play for peer:', peerId);
				// Try to play the audio
				audio.play().catch(error => {
					console.error('Failed to autoplay audio for peer', peerId, ':', error);
					// This might be due to browser autoplay policy
					console.log('Audio autoplay blocked. User interaction required.');
				});
			};
			
			console.log('Created audio element for peer:', peerId);
		} catch (error) {
			console.error('Error setting up remote audio playback for peer', peerId, ':', error);
		}
	}

	private createPeerConnection(peerId: string): RTCPeerConnection {
		const peer = new RTCPeerConnection({
			iceServers: [
				{ urls: 'stun:stun.l.google.com:19302' },
				{ urls: 'stun:stun1.l.google.com:19302' }
			]
		});

		// Add local stream tracks
		if (this.localStream) {
			this.localStream.getTracks().forEach(track => {
				peer.addTrack(track, this.localStream!);
			});
		}

		// Handle incoming tracks
		peer.ontrack = (event) => {
			console.log(`Received remote stream from peer ${peerId}`);
			const stream = event.streams[0];
			this.remoteStreams.set(peerId, stream);
			this.state.update(s => ({
				...s,
				remoteStreams: new Map(this.remoteStreams)
			}));
			
			// Play the remote audio
			this.playRemoteAudio(stream, peerId);
		};

		// Handle ICE candidates
		peer.onicecandidate = (event) => {
			if (event.candidate) {
				console.log(`Sending ICE candidate to peer ${peerId}:`, event.candidate.type);
				this.sendMessage({
					type: 'ice-candidate',
					target_id: parseInt(peerId),
					data: event.candidate
				});
			} else {
				console.log(`ICE candidate gathering completed for peer ${peerId}`);
			}
		};

		// Handle connection state changes
		peer.onconnectionstatechange = () => {
			console.log(`Peer ${peerId} connection state:`, peer.connectionState);
			
			if (peer.connectionState === 'connected') {
				console.log(`✅ WebRTC connection established with peer ${peerId}`);
				this.state.update(s => ({ ...s, connectionQuality: 'excellent' }));
			} else if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
				console.log(`❌ WebRTC connection failed/disconnected with peer ${peerId}`);
				this.state.update(s => ({ ...s, connectionQuality: 'poor' }));
			}
		};

		// Handle ICE connection state changes
		peer.oniceconnectionstatechange = () => {
			console.log(`Peer ${peerId} ICE connection state:`, peer.iceConnectionState);
		};

		// Handle ICE gathering state changes
		peer.onicegatheringstatechange = () => {
			console.log(`Peer ${peerId} ICE gathering state:`, peer.iceGatheringState);
		};

		this.peers.set(peerId, peer);
		this.state.update(s => ({
			...s,
			peers: new Map(this.peers)
		}));

		return peer;
	}

	private removePeerConnection(peerId: string) {
		const peer = this.peers.get(peerId);
		if (peer) {
			peer.close();
			this.peers.delete(peerId);
			this.remoteStreams.delete(peerId);
			
			// Remove audio element for this peer
			const audioElement = document.getElementById(`remote-audio-${peerId}`);
			if (audioElement) {
				audioElement.remove();
				console.log('Removed audio element for peer:', peerId);
			}
			
			this.state.update(s => ({
				...s,
				peers: new Map(this.peers),
				remoteStreams: new Map(this.remoteStreams)
			}));
		}
	}

	setMuted(muted: boolean): void {
		if (this.localStream) {
			this.localStream.getAudioTracks().forEach(track => {
				track.enabled = !muted;
			});
		}

		this.state.update(s => ({ ...s, isMuted: muted }));

		// Get current state to include channel information
		const state = this.getState();

		this.sendMessage({
			type: muted ? 'mute' : 'unmute',
			channel_id: state.currentChannelId || 0
		});
	}

	setDeafened(deafened: boolean): void {
		this.state.update(s => ({ ...s, isDeafened: deafened }));

		// Mute/unmute all remote audio elements
		this.peers.forEach((peer, peerId) => {
			const audioElement = document.getElementById(`remote-audio-${peerId}`) as HTMLAudioElement;
			if (audioElement) {
				audioElement.muted = deafened;
			}
		});

		// Get current state to include channel information
		const state = this.getState();

		this.sendMessage({
			type: deafened ? 'deafen' : 'undeafen',
			channel_id: state.currentChannelId || 0
		});
	}

	private setSpeaking(speaking: boolean): void {
		this.state.update(s => ({ ...s, isSpeaking: speaking }));

		// Clear existing timeout
		if (this.speakingTimeout) {
			clearTimeout(this.speakingTimeout);
		}

		// Get current state to include channel information
		const state = this.getState();
		
		console.log('setSpeaking called:', { speaking, state: { isConnected: state.isConnected, currentChannelId: state.currentChannelId, wsState: this.ws?.readyState } });
		
		// Only send speaking messages if we're connected and in a channel
		if (state.isConnected && state.currentChannelId && this.ws?.readyState === WebSocket.OPEN) {
			console.log('Sending speaking message with channel_id:', state.currentChannelId);
			this.sendMessage({
				type: 'speaking',
				channel_id: state.currentChannelId,
				data: speaking
			});
		} else {
			console.log('Not sending speaking message - conditions not met');
		}

		// Auto-stop speaking after 500ms of silence
		if (speaking) {
			this.speakingTimeout = window.setTimeout(() => {
				this.setSpeaking(false);
			}, 500);
		}
	}

	updateSettings(newSettings: Partial<VoiceSettings>): void {
		this.settings.update(s => ({ ...s, ...newSettings }));
		this.saveSettings();

		// Apply settings to current stream
		if (this.localStream) {
			this.localStream.getAudioTracks().forEach(track => {
				const settings = track.getSettings();
				// Apply new settings if possible
				// Note: Some settings require recreating the stream
			});
		}
	}

	async getAudioDevices(): Promise<MediaDeviceInfo[]> {
		try {
			// Check if MediaDevices API is available
			if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
				console.warn('MediaDevices API not available');
				return [];
			}

			// Request permission first
			await navigator.mediaDevices.getUserMedia({ audio: true });
			
			const devices = await navigator.mediaDevices.enumerateDevices();
			return devices.filter(device => device.kind === 'audioinput' || device.kind === 'audiooutput');
		} catch (error) {
			console.error('Failed to get audio devices:', error);
			return [];
		}
	}

	disconnect(): void {
		console.log('Disconnecting voice client completely...');
		
		// Stop voice activity detection first
		this.cleanupVoiceActivityDetection();
		
		// Stop local stream
		if (this.localStream) {
			this.localStream.getTracks().forEach(track => {
				console.log('Stopping local audio track');
				track.stop();
			});
			this.localStream = null;
		}

		// Clean up all peer connections and audio elements
		this.peers.forEach((peer, peerId) => {
			console.log('Closing peer connection:', peerId);
			peer.close();
			// Remove audio element for this peer
			const audioElement = document.getElementById(`remote-audio-${peerId}`);
			if (audioElement) {
				audioElement.remove();
			}
		});
		this.peers.clear();
		this.remoteStreams.clear();

		// Close WebSocket connection
		if (this.ws) {
			try {
				this.ws.close();
			} catch (error) {
				console.warn('Error closing WebSocket:', error);
			}
			this.ws = null;
		}

		// Reset all state
		this.state.update(s => ({
			...s,
			isConnected: false,
			isRegistered: false,
			isMuted: false,
			isDeafened: false,
			isSpeaking: false,
			currentChannelId: null,
			peers: new Map(),
			localStream: null,
			remoteStreams: new Map(),
			connectionQuality: 'disconnected'
		}));

		console.log('Voice client disconnected completely');
	}

	// Method to handle audio autoplay issues
	handleAudioAutoplay(): void {
		// Try to play all existing remote audio streams
		this.remoteStreams.forEach((stream, peerId) => {
			const audioElement = document.getElementById(`remote-audio-${peerId}`) as HTMLAudioElement;
			if (audioElement && audioElement.paused) {
				audioElement.play().catch(error => {
					console.error('Failed to play audio for peer', peerId, 'after user interaction:', error);
				});
			}
		});
	}
}

	// Export singleton instance
export const voiceClient = new VoiceClient(); 