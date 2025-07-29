import { writable, type Writable } from 'svelte/store';

export interface VoiceState {
	isConnected: boolean;
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
					this.settings.set({ ...this.getSettings(), ...parsed });
				} catch (e) {
					console.error('Failed to load voice settings:', e);
				}
			}
		}
	}

	private saveSettings() {
		if (typeof window !== 'undefined') {
			const settings = this.getSettings();
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

	async connect(token: string, serverUrl: string = import.meta.env.PUBLIC_WS_URL || 'ws://localhost:8081'): Promise<void> {
		if (this.ws?.readyState === WebSocket.OPEN) {
			return;
		}

		try {
			this.ws = new WebSocket(`${serverUrl.replace('http', 'ws')}/voice?token=${token}`);
			
			this.ws.onopen = () => {
				console.log('Voice WebSocket connected');
				this.state.update(s => ({ ...s, isConnected: true, connectionQuality: 'excellent' }));
				this.reconnectAttempts = 0;
			};

			this.ws.onmessage = (event) => {
				this.handleMessage(JSON.parse(event.data));
			};

			this.ws.onclose = () => {
				console.log('Voice WebSocket disconnected');
				this.state.update(s => ({ ...s, isConnected: false, connectionQuality: 'disconnected' }));
				this.handleDisconnect();
			};

			this.ws.onerror = (error) => {
				console.error('Voice WebSocket error:', error);
				this.state.update(s => ({ ...s, connectionQuality: 'poor' }));
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
			case 'pong':
				// Handle pong response
				break;
			default:
				console.warn('Unknown voice message type:', message.type);
		}
	}

	private handleConnected(message: any) {
		console.log('Connected to voice server');
	}

	private handleChannelJoined(message: any) {
		const { channel_id, server_id, channel_name, clients } = message.data;
		
		this.state.update(s => ({
			...s,
			currentChannelId: channel_id
		}));

		console.log(`Joined voice channel: ${channel_name} (${channel_id})`);
		
		// Initialize peer connections for existing clients
		clients.forEach((client: any) => {
			if (client.user_id !== message.user_id) {
				this.createPeerConnection(client.user_id.toString());
			}
		});
	}

	private handleUserJoined(message: any) {
		const peerId = message.user_id.toString();
		this.createPeerConnection(peerId);
	}

	private handleUserLeft(message: any) {
		const peerId = message.user_id.toString();
		this.removePeerConnection(peerId);
	}

	private async handleOffer(message: any) {
		const peerId = message.user_id.toString();
		const peer = this.peers.get(peerId);
		
		if (!peer) {
			console.warn('Received offer for unknown peer:', peerId);
			return;
		}

		try {
			await peer.setRemoteDescription(new RTCSessionDescription(message.data));
			const answer = await peer.createAnswer();
			await peer.setLocalDescription(answer);
			
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
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		} else {
			console.warn('Voice WebSocket not connected');
		}
	}

	async joinChannel(channelId: number, serverId: number): Promise<void> {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			throw new Error('Voice WebSocket not connected');
		}

		this.sendMessage({
			type: 'join-channel',
			channel_id: channelId,
			server_id: serverId
		});
	}

	async leaveChannel(): Promise<void> {
		const state = this.getState();
		if (!state.currentChannelId) {
			return;
		}

		this.sendMessage({
			type: 'leave-channel',
			channel_id: state.currentChannelId
		});

		// Clean up peer connections
		this.peers.forEach(peer => {
			peer.close();
		});
		this.peers.clear();
		this.remoteStreams.clear();

		this.state.update(s => ({
			...s,
			currentChannelId: null,
			peers: new Map(),
			remoteStreams: new Map()
		}));
	}

	async startLocalStream(): Promise<MediaStream | null> {
		try {
			// Check if MediaDevices API is available
			if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
				throw new Error('MediaDevices API not available. Please use HTTPS or grant microphone permissions.');
			}

			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					noiseSuppression: this.settings.get().noiseSuppression,
					echoCancellation: this.settings.get().echoCancellation,
					autoGainControl: this.settings.get().autoGainControl
				},
				video: false
			});

			this.localStream = stream;
			this.state.update(s => ({ ...s, localStream: stream }));

			// Start voice activity detection if enabled
			if (this.settings.get().voiceActivityDetection) {
				this.setupVoiceActivityDetection(stream);
			}

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
		if (this.voiceActivityDetector) {
			this.voiceActivityDetector.scriptProcessor.disconnect();
			this.voiceActivityDetector.microphone.disconnect();
			this.voiceActivityDetector.audioContext.close();
			this.voiceActivityDetector = null;
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
			const stream = event.streams[0];
			this.remoteStreams.set(peerId, stream);
			this.state.update(s => ({
				...s,
				remoteStreams: new Map(this.remoteStreams)
			}));
		};

		// Handle ICE candidates
		peer.onicecandidate = (event) => {
			if (event.candidate) {
				this.sendMessage({
					type: 'ice-candidate',
					target_id: parseInt(peerId),
					data: event.candidate
				});
			}
		};

		// Handle connection state changes
		peer.onconnectionstatechange = () => {
			console.log(`Peer ${peerId} connection state:`, peer.connectionState);
			
			if (peer.connectionState === 'connected') {
				this.state.update(s => ({ ...s, connectionQuality: 'excellent' }));
			} else if (peer.connectionState === 'failed' || peer.connectionState === 'disconnected') {
				this.state.update(s => ({ ...s, connectionQuality: 'poor' }));
			}
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

		this.sendMessage({
			type: muted ? 'mute' : 'unmute'
		});
	}

	setDeafened(deafened: boolean): void {
		this.state.update(s => ({ ...s, isDeafened: deafened }));

		this.sendMessage({
			type: deafened ? 'deafen' : 'undeafen'
		});
	}

	private setSpeaking(speaking: boolean): void {
		this.state.update(s => ({ ...s, isSpeaking: speaking }));

		// Clear existing timeout
		if (this.speakingTimeout) {
			clearTimeout(this.speakingTimeout);
		}

		// Send speaking state
		this.sendMessage({
			type: 'speaking',
			data: speaking
		});

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
		this.cleanupVoiceActivityDetection();
		
		if (this.localStream) {
			this.localStream.getTracks().forEach(track => track.stop());
			this.localStream = null;
		}

		this.peers.forEach(peer => peer.close());
		this.peers.clear();
		this.remoteStreams.clear();

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.state.update(s => ({
			...s,
			isConnected: false,
			isMuted: false,
			isDeafened: false,
			isSpeaking: false,
			currentChannelId: null,
			peers: new Map(),
			localStream: null,
			remoteStreams: new Map(),
			connectionQuality: 'disconnected'
		}));
	}
}

// Export singleton instance
export const voiceClient = new VoiceClient(); 