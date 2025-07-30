import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { VoiceStore, VoiceConnection, VoiceParticipant } from '$lib/types';

// Initial voice store state
const initialVoiceState: VoiceStore = {
	currentConnection: null,
	isConnecting: false,
	error: null,
	devices: {
		audioInput: [],
		audioOutput: []
	},
	settings: {
		inputDeviceId: null,
		outputDeviceId: null,
		inputVolume: 80,
		outputVolume: 80,
		echoCancellation: true,
		noiseSuppression: true,
		autoGainControl: true,
		voiceActivityDetection: true,
		pushToTalk: false,
		pushToTalkKey: 'Space'
	}
};

// Create the voice store
export const voiceStore = writable<VoiceStore>(initialVoiceState);

// Derived stores
export const currentVoiceConnection = derived(voiceStore, ($voice) => $voice.currentConnection);
export const isConnectedToVoice = derived(voiceStore, ($voice) => $voice.currentConnection?.isConnected ?? false);
export const voiceParticipants = derived(voiceStore, ($voice) => $voice.currentConnection?.participants ?? []);
export const voiceSettings = derived(voiceStore, ($voice) => $voice.settings);

// WebRTC configuration
const rtcConfig: RTCConfiguration = {
	iceServers: [
		{ urls: 'stun:stun.l.google.com:19302' },
		{ urls: 'stun:stun1.l.google.com:19302' }
	],
	iceCandidatePoolSize: 10
};

// Voice client class for managing WebRTC connections
class VoiceClient {
	private ws: WebSocket | null = null;
	private localStream: MediaStream | null = null;
	private connections: Map<number, RTCPeerConnection> = new Map();
	private channelId: number | null = null;
	private userId: number | null = null;

	constructor() {
		this.setupEventListeners();
	}

	private setupEventListeners() {
		if (!browser) return;
		document.addEventListener('keydown', this.handleKeyDown.bind(this));
		document.addEventListener('keyup', this.handleKeyUp.bind(this));
	}

	private handleKeyDown(event: KeyboardEvent) {
		const settings = get(voiceSettings);
		if (settings.pushToTalk && event.code === settings.pushToTalkKey && this.localStream) {
			this.setMuted(false);
		}
	}

	private handleKeyUp(event: KeyboardEvent) {
		const settings = get(voiceSettings);
		if (settings.pushToTalk && event.code === settings.pushToTalkKey && this.localStream) {
			this.setMuted(true);
		}
	}

	async joinVoiceChannel(channelId: number, userId: number, wsUrl: string): Promise<void> {
		try {
			voiceStore.update(state => ({ ...state, isConnecting: true, error: null }));

			this.channelId = channelId;
			this.userId = userId;

			const settings = get(voiceSettings);
			this.localStream = await navigator.mediaDevices.getUserMedia({
				audio: {
					deviceId: settings.inputDeviceId ? { exact: settings.inputDeviceId } : undefined,
					echoCancellation: settings.echoCancellation,
					noiseSuppression: settings.noiseSuppression,
					autoGainControl: settings.autoGainControl,
					sampleRate: 48000
				}
			});

			if (settings.pushToTalk) {
				this.setMuted(true);
			}

			this.ws = new WebSocket(wsUrl);

			this.ws.onopen = () => {
				this.sendSignaling({
					type: 'join_voice',
					channelId,
					userId
				});
			};

			this.ws.onmessage = this.handleWebSocketMessage.bind(this);

			// Update store with connection
			voiceStore.update(state => ({
				...state,
				currentConnection: {
					id: channelId,
					isConnected: true,
					isMuted: settings.pushToTalk,
					isDeafened: false,
					participants: []
				},
				isConnecting: false
			}));

		} catch (error) {
			voiceStore.update(state => ({
				...state,
				isConnecting: false,
				error: error instanceof Error ? error.message : 'Failed to join voice channel'
			}));
			throw error;
		}
	}

	setMuted(muted: boolean) {
		if (this.localStream) {
			this.localStream.getAudioTracks().forEach(track => {
				track.enabled = !muted;
			});
		}

		voiceStore.update(state => ({
			...state,
			currentConnection: state.currentConnection ? {
				...state.currentConnection,
				isMuted: muted
			} : null
		}));

		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.sendSignaling({
				type: 'mute_state',
				muted,
				channelId: this.channelId,
				userId: this.userId
			});
		}
	}

	private sendSignaling(message: unknown) {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(message));
		}
	}

	private async handleWebSocketMessage(event: MessageEvent) {
		try {
			const data = JSON.parse(event.data);
			// Handle signaling messages
		} catch (error) {
			// Handle parsing errors silently
		}
	}

	async leaveVoiceChannel(): Promise<void> {
		if (this.localStream) {
			this.localStream.getTracks().forEach(track => track.stop());
			this.localStream = null;
		}

		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}

		this.connections.forEach(connection => {
			connection.close();
		});
		this.connections.clear();

		voiceStore.update(state => ({
			...state,
			currentConnection: null,
			isConnecting: false,
			error: null
		}));
	}

	async getDevices(): Promise<{ audioInput: MediaDeviceInfo[]; audioOutput: MediaDeviceInfo[] }> {
		if (!browser) {
			return { audioInput: [], audioOutput: [] };
		}

		try {
			const devices = await navigator.mediaDevices.enumerateDevices();
			const audioInput = devices.filter(device => device.kind === 'audioinput');
			const audioOutput = devices.filter(device => device.kind === 'audiooutput');

			voiceStore.update(state => ({
				...state,
				devices: { audioInput, audioOutput }
			}));

			return { audioInput, audioOutput };
		} catch (error) {
			return { audioInput: [], audioOutput: [] };
		}
	}
}

// Create voice client instance
const voiceClient = new VoiceClient();

// Voice actions
export const voiceActions = {
	async joinVoiceChannel(channelId: number, userId: number, wsUrl: string): Promise<void> {
		if (!voiceClient) throw new Error('Voice client not available');
		await voiceClient.joinVoiceChannel(channelId, userId, wsUrl);
	},

	async leaveVoiceChannel(): Promise<void> {
		if (!voiceClient) return;
		await voiceClient.leaveVoiceChannel();
	},

	toggleMute(): void {
		if (!voiceClient) return;
		const currentConnection = get(currentVoiceConnection);
		if (currentConnection) {
			voiceClient.setMuted(!currentConnection.isMuted);
		}
	},

	toggleDeafen(): void {
		voiceStore.update(state => ({
			...state,
			currentConnection: state.currentConnection ? {
				...state.currentConnection,
				isDeafened: !state.currentConnection.isDeafened
			} : null
		}));
	},

	updateSettings(settings: Partial<VoiceStore['settings']>): void {
		voiceStore.update(state => ({
			...state,
			settings: { ...state.settings, ...settings }
		}));
	},

	async loadDevices(): Promise<void> {
		if (!voiceClient) return;
		await voiceClient.getDevices();
	}
};
