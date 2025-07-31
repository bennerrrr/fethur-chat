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

		// Set up page unload handler for proper cleanup
		this.setupPageUnloadHandler();
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
		console.log('=== VOICE CLIENT CONNECT START ===');
		console.log('Token provided:', token ? 'YES' : 'NO');
		console.log('Token length:', token.length);
		console.log('Server URL:', serverUrl);
		
		// Always disconnect first to ensure clean state
		if (this.ws) {
			console.log('Disconnecting existing WebSocket connection for clean reconnection...');
			this.disconnect();
			// Wait a moment for cleanup
			await new Promise(resolve => setTimeout(resolve, 100));
		}

		try {
			console.log('Connecting to voice WebSocket...');
			
			// Use relative URL in browser to leverage Vite's proxy
			const wsUrl = typeof window !== 'undefined' ? `/voice?token=${encodeURIComponent(token)}` : `${serverUrl.replace('https://', 'wss://').replace('http://', 'ws://')}/voice?token=${encodeURIComponent(token)}`;
			console.log('WebSocket URL:', wsUrl);
			console.log('Window object available:', typeof window !== 'undefined');
			
			// Add connection timeout (reduced from 10s to 5s)
			const connectionTimeout = setTimeout(() => {
				if (this.ws?.readyState === WebSocket.CONNECTING) {
					console.error('Voice WebSocket connection timeout (5s)');
					this.ws.close();
				}
			}, 5000); // 5 second timeout
			
                        console.log('Creating WebSocket connection...');
                        this.ws = new WebSocket(wsUrl);
                        console.log('WebSocket created, readyState:', this.ws.readyState);

                        // Set up message handler immediately to avoid missing early messages
                        this.ws.onmessage = (event) => {
                                console.log('=== WEBSOCKET MESSAGE RECEIVED ===');
                                console.log('Raw WebSocket message received:', event.data);
                                console.log('Message type:', typeof event.data);
                                console.log('Message length:', event.data.length);

                                try {
                                        const data = JSON.parse(event.data);
                                        console.log('Parsed WebSocket message:', data);
                                        console.log('Message type field:', data.type);
                                        this.handleMessage(data);
                                } catch (error) {
                                        console.error('Failed to parse voice message:', error);
                                        console.error('Raw message was:', event.data);
                                }
                                console.log('=== END WEBSOCKET MESSAGE ===');
                        };

                        // Wait for connection to be established
                        await new Promise<void>((resolve, reject) => {
                                this.ws!.onopen = () => {
                                        console.log('Voice WebSocket connected successfully');
                                        console.log('WebSocket readyState after open:', this.ws!.readyState);
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

                        // Wait a short moment for any immediate messages (like 'connected')
                        console.log('Waiting for immediate messages...');
                        await new Promise(resolve => setTimeout(resolve, 100));
                        console.log('=== VOICE CLIENT CONNECT END ===');

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
		console.log('=== HANDLING VOICE MESSAGE ===');
		console.log('Voice message received:', message);
		console.log('Message type:', message.type);
		console.log('Current state before processing:', this.getState());

		switch (message.type) {
			case 'connected':
				console.log('Processing connected message...');
				this.handleConnected(message);
				break;
			case 'channel-joined':
				console.log('Processing channel-joined message...');
				this.handleChannelJoined(message);
				break;
			case 'user-joined':
				console.log('Processing user-joined message...');
				this.handleUserJoined(message);
				break;
			case 'user-left':
				console.log('Processing user-left message...');
				this.handleUserLeft(message);
				break;
			case 'offer':
				console.log('Processing offer message...');
				this.handleOffer(message);
				break;
			case 'answer':
				console.log('Processing answer message...');
				this.handleAnswer(message);
				break;
			case 'ice-candidate':
				console.log('Processing ice-candidate message...');
				this.handleIceCandidate(message);
				break;
			case 'mute':
			case 'unmute':
			case 'deafen':
			case 'undeafen':
				console.log('Processing voice state change message...');
				this.handleVoiceStateChange(message);
				break;
			case 'speaking':
				console.log('Processing speaking message...');
				this.handleSpeaking(message);
				break;
			case 'ping':
				console.log('Processing ping message...');
				// Respond to ping with pong
				this.sendMessage({
					type: 'pong',
					timestamp: new Date().toISOString()
				});
				break;
			case 'pong':
				console.log('Processing pong message...');
				// Handle pong response
				break;
			default:
				console.warn('Unknown voice message type:', message.type);
		}
		
		console.log('Current state after processing:', this.getState());
		console.log('=== END HANDLING VOICE MESSAGE ===');
	}

	private handleConnected(message: any) {
		console.log('=== HANDLING CONNECTED MESSAGE ===');
		console.log('Received connected message from server:', message);
		console.log('Current state before setting isRegistered:', this.getState());
		
		// Mark as fully registered and ready to join channels
		this.state.update(s => ({ 
			...s, 
			isRegistered: true,
			isConnected: true,
			connectionQuality: 'excellent'
		}));
		
		console.log('State updated after connected message:', this.getState());
		console.log('Voice client is now registered and ready to join channels');
		console.log('=== END HANDLING CONNECTED MESSAGE ===');
	}

	private async handleChannelJoined(message: any) {
		console.log('Received channel-joined message:', message);
		const { channel_id, server_id, channel_name, clients } = message.data;
		
		this.state.update(s => ({
			...s,
			currentChannelId: channel_id,
			isConnected: true
		}));

		console.log(`Joined voice channel: ${channel_name} (${channel_id})`);
		console.log('Current state after joining:', this.getState());
		console.log('Existing clients in channel:', clients);
		
		// Initialize peer connections for existing clients and create offers
		for (const client of clients) {
			if (client.user_id !== message.user_id) {
				console.log(`Setting up peer connection for existing client ${client.user_id}`);
				const peer = this.createPeerConnection(client.user_id.toString());
				
				// If we have a local stream, create and send an offer
				if (this.localStream) {
					try {
						console.log(`Creating offer for existing client ${client.user_id} with local stream:`, this.localStream);
						const offer = await peer.createOffer();
						console.log(`Offer created for existing client ${client.user_id}:`, offer);
						await peer.setLocalDescription(offer);
						
						this.sendMessage({
							type: 'offer',
							target_id: client.user_id,
							data: offer
						});
						console.log(`Offer sent to existing client ${client.user_id}`);
					} catch (error) {
						console.error('Error creating offer for existing client:', error);
					}
				} else {
					console.warn(`No local stream available for existing client ${client.user_id}`);
				}
			}
		}
	}

	private async handleUserJoined(message: any) {
		const peerId = message.user_id.toString();
		console.log(`User ${peerId} joined, creating peer connection`);
		
		const peer = this.createPeerConnection(peerId);
		
		// If we have a local stream, create and send an offer
		if (this.localStream) {
			try {
				console.log(`Creating offer for new user ${peerId} with local stream:`, this.localStream);
				const offer = await peer.createOffer();
				console.log(`Offer created for user ${peerId}:`, offer);
				await peer.setLocalDescription(offer);
				
				this.sendMessage({
					type: 'offer',
					target_id: message.user_id,
					data: offer
				});
				console.log(`Offer sent to user ${peerId}`);
			} catch (error) {
				console.error('Error creating offer:', error);
			}
		} else {
			console.warn(`No local stream available when user ${peerId} joined`);
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

		// Wait for registration to complete with better error handling
		const state = this.getState();
		if (!state.isRegistered) {
			console.log('Waiting for registration to complete...');
			console.log('Current state before waiting:', this.getState());
			
			// Try to trigger registration by sending a ping first
			console.log('Sending ping to trigger registration...');
			this.sendMessage({
				type: 'ping',
				timestamp: new Date().toISOString()
			});
			
			// Wait a moment for any immediate response
			await new Promise(resolve => setTimeout(resolve, 500));
			
			// Check if we got registered during the ping
			const stateAfterPing = this.getState();
			if (stateAfterPing.isRegistered) {
				console.log('Registration completed after ping');
			} else {
				console.log('Still not registered after ping, waiting for registration...');
				
				await new Promise<void>((resolve, reject) => {
					const unsubscribe = this.state.subscribe((s) => {
						console.log('State changed during registration wait:', s);
						if (s.isRegistered) {
							console.log('Registration completed successfully');
							unsubscribe();
							resolve();
						}
					});
					
					// Timeout after 10 seconds (increased from 5s)
					const timeout = setTimeout(() => {
						console.error('Registration timeout - client not registered after 10 seconds');
						unsubscribe();
						reject(new Error('Registration timeout - client not registered'));
					}, 10000);
					
					// Clean up timeout if resolved
					const originalResolve = resolve;
					resolve = () => {
						clearTimeout(timeout);
						originalResolve();
					};
				});
			}
		}

		// Double-check registration after waiting
		const finalState = this.getState();
		if (!finalState.isRegistered) {
			console.error('Still not registered after waiting. Final state:', finalState);
			
			// Try one more time with a ping
			console.log('Attempting final registration attempt with ping...');
			this.sendMessage({
				type: 'ping',
				timestamp: new Date().toISOString()
			});
			
			// Wait a bit more
			await new Promise(resolve => setTimeout(resolve, 2000));
			
			const finalCheckState = this.getState();
			if (!finalCheckState.isRegistered) {
				throw new Error('Failed to register with voice server after multiple attempts');
			} else {
				console.log('Registration succeeded on final attempt');
			}
		}

		console.log('Registration confirmed, proceeding with channel join...');

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
			try {
				this.sendMessage({
					type: 'leave-channel',
					channel_id: state.currentChannelId
				});
				console.log('Leave channel message sent to server');
			} catch (error) {
				console.error('Failed to send leave channel message:', error);
			}
		}

		// Clean up peer connections
		this.peers.forEach((peer, peerId) => {
			console.log('Closing peer connection:', peerId);
			try {
				peer.close();
			} catch (error) {
				console.warn('Error closing peer connection:', error);
			}
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
				try {
					track.stop();
				} catch (error) {
					console.warn('Error stopping local audio track:', error);
				}
			});
			this.localStream = null;
		}

		// Close WebSocket connection properly
		if (this.ws) {
			try {
				if (this.ws.readyState === WebSocket.OPEN) {
					console.log('Closing WebSocket connection after leaving channel...');
					this.ws.close(1000, 'Leaving voice channel');
				}
			} catch (error) {
				console.warn('Error closing WebSocket:', error);
			}
			this.ws = null;
		}

		// Update state immediately - reset everything
		this.state.update(s => ({
			...s,
			currentChannelId: null,
			peers: new Map(),
			remoteStreams: new Map(),
			localStream: null,
			isSpeaking: false,
			isConnected: false,
			isRegistered: false,
			connectionQuality: 'disconnected'
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
			console.log('Starting local stream with settings:', settings);
			
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					noiseSuppression: settings.noiseSuppression,
					echoCancellation: settings.echoCancellation,
					autoGainControl: settings.autoGainControl,
					// Add additional audio constraints for better quality
					sampleRate: 48000,
					channelCount: 1,
					volume: settings.inputVolume / 100
				},
				video: false
			});

			console.log('Local stream obtained:', stream);
			console.log('Audio tracks:', stream.getAudioTracks());
			console.log('Video tracks:', stream.getVideoTracks());

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

		try {
			const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
			const analyser = audioContext.createAnalyser();
			const microphone = audioContext.createMediaStreamSource(stream);
			
			// Check if ScriptProcessor is supported
			if (!audioContext.createScriptProcessor) {
				console.warn('ScriptProcessor not supported, using basic analyser for voice activity detection');
				// Fallback to basic analyser
				analyser.smoothingTimeConstant = 0.8;
				analyser.fftSize = 1024;
				
				microphone.connect(analyser);
				
				const dataArray = new Uint8Array(analyser.frequencyBinCount);
				let lastSpeakingState = false;
				
				const checkAudioLevel = () => {
					analyser.getByteFrequencyData(dataArray);
					const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
					const threshold = 50; // Increased threshold to reduce sensitivity
					const isSpeaking = average > threshold;
					
					// Only log when state changes to reduce console spam
					if (isSpeaking !== lastSpeakingState) {
						console.log('Voice activity changed:', { average, threshold, isSpeaking });
						lastSpeakingState = isSpeaking;
						this.setSpeaking(isSpeaking);
					}
					
					// Continue checking
					requestAnimationFrame(checkAudioLevel);
				};
				
				checkAudioLevel();
				
				this.voiceActivityDetector = { audioContext, analyser, microphone, checkAudioLevel };
				return;
			}
			
			const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);

			analyser.smoothingTimeConstant = 0.8;
			analyser.fftSize = 1024;

			microphone.connect(analyser);
			analyser.connect(scriptProcessor);
			scriptProcessor.connect(audioContext.destination);

			const dataArray = new Uint8Array(analyser.frequencyBinCount);
			let lastSpeakingState = false;

			scriptProcessor.onaudioprocess = () => {
				analyser.getByteFrequencyData(dataArray);
				
				// Calculate average volume
				const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
				
				// Threshold for voice activity (increased to reduce sensitivity)
				const threshold = 50;
				const isSpeaking = average > threshold;

				// Only log when state changes to reduce console spam
				if (isSpeaking !== lastSpeakingState) {
					console.log('Voice activity changed (ScriptProcessor):', { average, threshold, isSpeaking });
					lastSpeakingState = isSpeaking;
					this.setSpeaking(isSpeaking);
				}
			};

			this.voiceActivityDetector = { audioContext, analyser, microphone, scriptProcessor };
			console.log('Voice activity detection setup complete');
		} catch (error) {
			console.error('Failed to setup voice activity detection:', error);
		}
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
				if (this.voiceActivityDetector.scriptProcessor) {
					this.voiceActivityDetector.scriptProcessor.disconnect();
				}
				if (this.voiceActivityDetector.microphone) {
					this.voiceActivityDetector.microphone.disconnect();
				}
				if (this.voiceActivityDetector.audioContext) {
					this.voiceActivityDetector.audioContext.close();
				}
				console.log('Voice activity detection cleaned up');
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
			console.log(`Setting up audio playback for peer ${peerId} with stream:`, stream);
			console.log(`Stream tracks:`, stream.getTracks());
			
			// Create audio element for this peer
			const audio = document.createElement('audio');
			audio.id = `remote-audio-${peerId}`;
			audio.autoplay = true;
			audio.playsInline = true;
			audio.controls = false; // Hide controls
			
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
			
			// Handle audio playing
			audio.onplaying = () => {
				console.log('Audio is now playing for peer:', peerId);
			};
			
			// Handle audio pause
			audio.onpause = () => {
				console.log('Audio paused for peer:', peerId);
			};
			
			// Handle audio volume change
			audio.onvolumechange = () => {
				console.log('Audio volume changed for peer:', peerId, 'volume:', audio.volume);
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
			],
			// Add important WebRTC configuration
			bundlePolicy: 'max-bundle',
			rtcpMuxPolicy: 'require',
			sdpSemantics: 'unified-plan'
		});

		console.log(`Creating peer connection for ${peerId} with local stream:`, this.localStream);

		// Add local stream tracks if available
		if (this.localStream) {
			console.log(`Adding ${this.localStream.getTracks().length} tracks to peer ${peerId}`);
			this.localStream.getTracks().forEach(track => {
				console.log(`Adding track to peer ${peerId}:`, track.kind, track.id);
				const sender = peer.addTrack(track, this.localStream!);
				console.log(`Track sender created for peer ${peerId}:`, sender);
			});
		} else {
			console.warn(`No local stream available when creating peer connection for ${peerId}`);
		}

		// Handle incoming tracks
		peer.ontrack = (event) => {
			console.log(`Received remote stream from peer ${peerId}:`, event);
			console.log(`Track kind: ${event.track.kind}, track id: ${event.track.id}`);
			console.log(`Streams count: ${event.streams.length}`);
			
			if (event.streams && event.streams.length > 0) {
				const stream = event.streams[0];
				console.log(`Setting remote stream for peer ${peerId}:`, stream);
				this.remoteStreams.set(peerId, stream);
				this.state.update(s => ({
					...s,
					remoteStreams: new Map(this.remoteStreams)
				}));
				
				// Play the remote audio
				this.playRemoteAudio(stream, peerId);
			} else {
				console.warn(`No streams in track event for peer ${peerId}`);
			}
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
		
		// Only log when state changes to reduce console spam
		if (speaking !== state.isSpeaking) {
			console.log('setSpeaking called:', { 
				speaking, 
				state: { 
					isConnected: state.isConnected, 
					isRegistered: state.isRegistered,
					currentChannelId: state.currentChannelId, 
					wsState: this.ws?.readyState 
				} 
			});
		}
		
		// Only send speaking messages if we're registered, in a channel, and WebSocket is open
		if (state.isRegistered && state.currentChannelId && this.ws?.readyState === WebSocket.OPEN) {
			console.log('Sending speaking message with channel_id:', state.currentChannelId);
			this.sendMessage({
				type: 'speaking',
				channel_id: state.currentChannelId,
				data: speaking
			});
		} else {
			console.log('Not sending speaking message - conditions not met:', {
				isRegistered: state.isRegistered,
				currentChannelId: state.currentChannelId,
				wsState: this.ws?.readyState
			});
		}

		// Auto-stop speaking after 300ms of silence (reduced from 500ms)
		if (speaking) {
			this.speakingTimeout = window.setTimeout(() => {
				this.setSpeaking(false);
			}, 300);
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
				try {
					track.stop();
				} catch (error) {
					console.warn('Error stopping local audio track:', error);
				}
			});
			this.localStream = null;
		}

		// Clean up all peer connections and audio elements
		this.peers.forEach((peer, peerId) => {
			console.log('Closing peer connection:', peerId);
			try {
				peer.close();
			} catch (error) {
				console.warn('Error closing peer connection:', error);
			}
			// Remove audio element for this peer
			const audioElement = document.getElementById(`remote-audio-${peerId}`);
			if (audioElement) {
				audioElement.remove();
			}
		});
		this.peers.clear();
		this.remoteStreams.clear();

		// Close WebSocket connection properly
		if (this.ws) {
			try {
				// Send a close message if the connection is still open
				if (this.ws.readyState === WebSocket.OPEN) {
					console.log('Closing WebSocket connection...');
					this.ws.close(1000, 'Client disconnecting');
				} else if (this.ws.readyState === WebSocket.CONNECTING) {
					console.log('Aborting WebSocket connection...');
					this.ws.close();
				}
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

		// Reset reconnection attempts
		this.reconnectAttempts = 0;

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

	// Method to manually test speaking functionality
	testSpeaking(): void {
		console.log('=== Voice Speaking Test ===');
		const state = this.getState();
		console.log('Current voice state:', state);
		console.log('WebSocket state:', this.ws?.readyState);
		console.log('Voice activity detector:', this.voiceActivityDetector ? 'Active' : 'Inactive');
		
		// Test sending a speaking message
		this.setSpeaking(true);
		
		// Test stopping speaking after 1 second
		setTimeout(() => {
			this.setSpeaking(false);
		}, 1000);
	}

	// Method to test WebRTC connections and audio transmission
	async testWebRTCConnection(): Promise<void> {
		console.log('=== WebRTC Connection Test ===');
		
		// Test local stream
		console.log('Local stream:', this.localStream);
		if (this.localStream) {
			console.log('Local stream tracks:', this.localStream.getTracks());
			this.localStream.getTracks().forEach(track => {
				console.log('Track:', {
					kind: track.kind,
					id: track.id,
					enabled: track.enabled,
					muted: track.muted,
					readyState: track.readyState
				});
			});
		}
		
		// Test peer connections
		console.log('Peer connections:', this.peers.size);
		this.peers.forEach((peer, peerId) => {
			console.log(`Peer ${peerId}:`, {
				connectionState: peer.connectionState,
				iceConnectionState: peer.iceConnectionState,
				iceGatheringState: peer.iceGatheringState,
				signalingState: peer.signalingState
			});
			
			// Test senders
			peer.getSenders().forEach(sender => {
				console.log(`Sender for peer ${peerId}:`, {
					track: sender.track ? {
						kind: sender.track.kind,
						id: sender.track.id,
						enabled: sender.track.enabled
					} : null,
					dtmfSender: sender.dtmfSender ? 'Available' : 'Not available'
				});
			});
			
			// Test receivers
			peer.getReceivers().forEach(receiver => {
				console.log(`Receiver for peer ${peerId}:`, {
					track: receiver.track ? {
						kind: receiver.track.kind,
						id: receiver.track.id,
						enabled: receiver.track.enabled
					} : null
				});
			});
		});
		
		// Test remote streams
		console.log('Remote streams:', this.remoteStreams.size);
		this.remoteStreams.forEach((stream, peerId) => {
			console.log(`Remote stream for peer ${peerId}:`, stream);
			console.log(`Remote stream tracks for peer ${peerId}:`, stream.getTracks());
		});
		
		// Test audio elements
		this.peers.forEach((peer, peerId) => {
			const audioElement = document.getElementById(`remote-audio-${peerId}`) as HTMLAudioElement;
			if (audioElement) {
				console.log(`Audio element for peer ${peerId}:`, {
					paused: audioElement.paused,
					ended: audioElement.ended,
					volume: audioElement.volume,
					muted: audioElement.muted,
					currentTime: audioElement.currentTime,
					duration: audioElement.duration,
					readyState: audioElement.readyState
				});
			} else {
				console.log(`No audio element found for peer ${peerId}`);
			}
		});
	}

	// Method to check backend connectivity
	async checkBackendConnectivity(): Promise<void> {
		console.log('=== CHECKING BACKEND CONNECTIVITY ===');
		
		if (!this.ws) {
			console.error('No WebSocket connection exists');
			return;
		}
		
		console.log('WebSocket state:', this.ws.readyState);
		console.log('WebSocket URL:', this.ws.url);
		
		if (this.ws.readyState !== WebSocket.OPEN) {
			console.error('WebSocket is not open. State:', this.ws.readyState);
			return;
		}
		
		// Send a ping and wait for response
		console.log('Sending ping to test connectivity...');
		const pingSent = Date.now();
		
		this.sendMessage({
			type: 'ping',
			timestamp: new Date().toISOString()
		});
		
		// Wait for response
		await new Promise(resolve => setTimeout(resolve, 3000));
		
		console.log('Connectivity check completed');
		console.log('Current state after ping:', this.getState());
	}

	// Method to manually trigger registration
	async triggerRegistration(): Promise<void> {
		console.log('=== TRIGGERING REGISTRATION ===');
		
		if (this.ws?.readyState !== WebSocket.OPEN) {
			console.error('Cannot trigger registration: WebSocket is not open');
			return;
		}
		
		const state = this.getState();
		if (state.isRegistered) {
			console.log('Client is already registered');
			return;
		}
		
		console.log('Sending ping to trigger registration...');
		this.sendMessage({
			type: 'ping',
			timestamp: new Date().toISOString()
		});
		
		// Wait for registration
		await new Promise<void>((resolve) => {
			const unsubscribe = this.state.subscribe((s) => {
				if (s.isRegistered) {
					console.log('Registration triggered successfully!');
					unsubscribe();
					resolve();
				}
			});
			
			// Timeout after 3 seconds
			setTimeout(() => {
				console.log('Registration trigger timeout');
				unsubscribe();
				resolve();
			}, 3000);
		});
		
		const finalState = this.getState();
		console.log('Final state after registration trigger:', finalState);
	}

	// Method to manually trigger re-registration
	async forceReRegistration(): Promise<void> {
		console.log('=== FORCE RE-REGISTRATION ===');
		
		const state = this.getState();
		console.log('Current state before re-registration:', state);
		
		if (this.ws?.readyState !== WebSocket.OPEN) {
			console.error('Cannot re-register: WebSocket is not open');
			return;
		}
		
		if (state.isRegistered) {
			console.log('Client is already registered, no need to re-register');
			return;
		}
		
		console.log('Attempting to force re-registration...');
		
		// Reset registration state
		this.state.update(s => ({
			...s,
			isRegistered: false,
			isConnected: false
		}));
		
		// Send a ping to trigger server response
		this.sendMessage({
			type: 'ping',
			timestamp: new Date().toISOString()
		});
		
		// Wait for potential re-registration
		await new Promise<void>((resolve) => {
			const unsubscribe = this.state.subscribe((s) => {
				if (s.isRegistered) {
					console.log('Re-registration successful!');
					unsubscribe();
					resolve();
				}
			});
			
			// Timeout after 5 seconds
			setTimeout(() => {
				console.log('Re-registration timeout');
				unsubscribe();
				resolve();
			}, 5000);
		});
		
		const finalState = this.getState();
		console.log('Final state after re-registration attempt:', finalState);
		
		if (!finalState.isRegistered) {
			console.error('Re-registration failed - client still not registered');
		} else {
			console.log('Re-registration successful!');
		}
	}

	// Method to comprehensively debug the current state
	async debugState(): Promise<void> {
		console.log('=== COMPREHENSIVE STATE DEBUG ===');
		
		const state = this.getState();
		console.log('Current Voice State:', {
			isConnected: state.isConnected,
			isRegistered: state.isRegistered,
			isMuted: state.isMuted,
			isDeafened: state.isDeafened,
			isSpeaking: state.isSpeaking,
			currentChannelId: state.currentChannelId,
			connectionQuality: state.connectionQuality,
			peersCount: state.peers.size,
			remoteStreamsCount: state.remoteStreams.size,
			hasLocalStream: !!state.localStream
		});
		
		console.log('WebSocket State:', {
			exists: !!this.ws,
			readyState: this.ws?.readyState,
			readyStateText: this.ws ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][this.ws.readyState] : 'NULL'
		});
		
		console.log('Internal State:', {
			reconnectAttempts: this.reconnectAttempts,
			maxReconnectAttempts: this.maxReconnectAttempts,
			hasVoiceActivityDetector: !!this.voiceActivityDetector,
			hasSpeakingTimeout: !!this.speakingTimeout,
			peersMapSize: this.peers.size,
			remoteStreamsMapSize: this.remoteStreams.size,
			hasLocalStream: !!this.localStream
		});
		
		if (this.localStream) {
			console.log('Local Stream Details:', {
				id: this.localStream.id,
				active: this.localStream.active,
				tracks: this.localStream.getTracks().map(track => ({
					kind: track.kind,
					id: track.id,
					enabled: track.enabled,
					muted: track.muted,
					readyState: track.readyState
				}))
			});
		}
		
		console.log('Voice Activity Detector:', this.voiceActivityDetector ? 'Active' : 'Inactive');
		
		// Check if we should be registered
		if (this.ws?.readyState === WebSocket.OPEN && !state.isRegistered) {
			console.log('🚨 ISSUE DETECTED: WebSocket is OPEN but client is NOT REGISTERED');
			console.log('This suggests the "connected" message was not received or processed');
		}
		
		if (state.isRegistered && !state.currentChannelId) {
			console.log('ℹ️ Client is registered but not in a channel');
		}
		
		if (state.currentChannelId && !state.isRegistered) {
			console.log('🚨 ISSUE DETECTED: Client is in a channel but NOT REGISTERED');
		}
		
		console.log('=== END STATE DEBUG ===');
	}

	// Method to manually check and fix registration state
	async checkAndFixRegistration(): Promise<void> {
		console.log('=== Checking Registration State ===');
		const state = this.getState();
		console.log('Current state:', state);
		console.log('WebSocket state:', this.ws?.readyState);
		
		if (this.ws?.readyState === WebSocket.OPEN && !state.isRegistered) {
			console.log('WebSocket is open but not registered. This might be a reconnection issue.');
			console.log('Attempting to force re-registration...');
			
			// Send a ping to see if we get a response
			this.sendMessage({
				type: 'ping',
				timestamp: new Date().toISOString()
			});
			
			// Wait a moment to see if we get any response
			setTimeout(() => {
				console.log('State after ping attempt:', this.getState());
			}, 2000);
		} else if (state.isRegistered) {
			console.log('Client is properly registered');
		} else {
			console.log('WebSocket is not open or client is not registered');
		}
	}

	// Method to test reconnection and debug state
	async testReconnection(): Promise<void> {
		console.log('=== Testing Reconnection ===');
		console.log('Current state before reconnection test:', this.getState());
		console.log('WebSocket state:', this.ws?.readyState);
		
		if (this.ws?.readyState === WebSocket.OPEN) {
			console.log('WebSocket is open, testing message handling...');
			// Send a ping to test if the connection is working
			this.sendMessage({
				type: 'ping',
				timestamp: new Date().toISOString()
			});
		} else {
			console.log('WebSocket is not open, current state:', this.ws?.readyState);
		}
		
		// Wait a moment and check state again
		setTimeout(() => {
			console.log('State after reconnection test:', this.getState());
		}, 1000);
	}

	// Method to force disconnect and reset everything
	forceDisconnect(): void {
		console.log('Force disconnecting voice client...');
		
		// Immediately reset all state
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

		// Force close WebSocket
		if (this.ws) {
			try {
				this.ws.close();
			} catch (error) {
				console.warn('Error force closing WebSocket:', error);
			}
			this.ws = null;
		}

		// Force close all peer connections
		this.peers.forEach((peer, peerId) => {
			try {
				peer.close();
			} catch (error) {
				console.warn('Error force closing peer connection:', error);
			}
		});
		this.peers.clear();

		// Force stop all audio tracks
		if (this.localStream) {
			this.localStream.getTracks().forEach(track => {
				try {
					track.stop();
				} catch (error) {
					console.warn('Error force stopping audio track:', error);
				}
			});
			this.localStream = null;
		}

		// Force cleanup voice activity detection
		this.cleanupVoiceActivityDetection();

		// Clear all audio elements
		this.peers.forEach((peer, peerId) => {
			const audioElement = document.getElementById(`remote-audio-${peerId}`);
			if (audioElement) {
				audioElement.remove();
			}
		});

		// Reset counters
		this.reconnectAttempts = 0;
		this.remoteStreams.clear();

		console.log('Voice client force disconnected');
	}

	// Method to handle page unload events
	setupPageUnloadHandler(): void {
		if (typeof window !== 'undefined') {
			const handleBeforeUnload = () => {
				console.log('Page unloading, cleaning up voice connections...');
				this.disconnect();
			};

			window.addEventListener('beforeunload', handleBeforeUnload);
			window.addEventListener('pagehide', handleBeforeUnload);
		}
	}
}

	// Export singleton instance
export const voiceClient = new VoiceClient(); 