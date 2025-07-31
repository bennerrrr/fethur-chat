import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { voiceClient } from './voice';

// Mock WebSocket with proper event handling
const createMockWebSocket = (readyState = 1) => {
	const mockWebSocket = {
		readyState,
		send: vi.fn(),
		close: vi.fn(),
		addEventListener: vi.fn((event, handler) => {
			// Simulate immediate connection for tests
			if (event === 'open' && readyState === 1) {
				setTimeout(() => handler(), 0);
			}
		}),
		removeEventListener: vi.fn()
	};
	return mockWebSocket;
};

// Mock MediaDevices
const mockMediaStream = {
	getTracks: () => [
		{
			stop: vi.fn(),
			getSettings: () => ({ deviceId: 'test-device' })
		}
	],
	getAudioTracks: () => [
		{
			stop: vi.fn(),
			getSettings: () => ({ deviceId: 'test-device' })
		}
	]
};

// Mock RTCPeerConnection
const mockRTCPeerConnection = {
	createOffer: vi.fn().mockResolvedValue({ type: 'offer', sdp: 'test-sdp' }),
	createAnswer: vi.fn().mockResolvedValue({ type: 'answer', sdp: 'test-sdp' }),
	setLocalDescription: vi.fn().mockResolvedValue(undefined),
	setRemoteDescription: vi.fn().mockResolvedValue(undefined),
	addIceCandidate: vi.fn().mockResolvedValue(undefined),
	addTrack: vi.fn(),
	close: vi.fn(),
	onicecandidate: null,
	ontrack: null,
	onconnectionstatechange: null,
	connectionState: 'connected'
};

// Mock AudioContext and AudioWorklet
const mockAudioContext = {
	createMediaStreamSource: vi.fn().mockReturnValue({
		connect: vi.fn(),
		disconnect: vi.fn()
	}),
	createAnalyser: vi.fn().mockReturnValue({
		connect: vi.fn(),
		disconnect: vi.fn(),
		getByteFrequencyData: vi.fn().mockImplementation((array) => {
			// Simulate voice activity
			for (let i = 0; i < array.length; i++) {
				array[i] = Math.random() * 255;
			}
		}),
		frequencyBinCount: 256
	}),
	audioWorklet: {
		addModule: vi.fn().mockResolvedValue(undefined)
	},
	createScriptProcessor: vi.fn().mockReturnValue({
		connect: vi.fn(),
		disconnect: vi.fn(),
		onaudioprocess: null
	})
};

// Mock document
const mockAudioElement = {
	play: vi.fn().mockResolvedValue(undefined),
	pause: vi.fn(),
	remove: vi.fn(),
	id: '',
	srcObject: null
};

// Setup global mocks
global.WebSocket = vi.fn(() => createMockWebSocket()) as any;
global.RTCPeerConnection = vi.fn(() => mockRTCPeerConnection) as any;
global.AudioContext = vi.fn(() => mockAudioContext) as any;
global.navigator.mediaDevices = {
	getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
	enumerateDevices: vi.fn().mockResolvedValue([
		{ deviceId: 'test-input', kind: 'audioinput', label: 'Test Microphone' },
		{ deviceId: 'test-output', kind: 'audiooutput', label: 'Test Speakers' }
	])
} as any;

// Mock document methods
Object.defineProperty(document, 'getElementById', {
	value: vi.fn(() => mockAudioElement),
	writable: true
});

Object.defineProperty(document, 'createElement', {
	value: vi.fn(() => mockAudioElement),
	writable: true
});

describe('Voice Client', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Reset voice client state
		voiceClient.disconnect();
		// Reset WebSocket mock
		global.WebSocket = vi.fn(() => createMockWebSocket()) as any;
	});

	afterEach(() => {
		voiceClient.disconnect();
	});

	describe('Voice Settings', () => {
		it('should update voice settings correctly', () => {
			const newSettings = {
				inputVolume: 0.8,
				outputVolume: 0.9,
				noiseSuppression: true,
				echoCancellation: true
			};

			voiceClient.updateSettings(newSettings);

			const settings = voiceClient.getSettings();
			expect(settings.inputVolume).toBe(0.8);
			expect(settings.outputVolume).toBe(0.9);
			expect(settings.noiseSuppression).toBe(true);
			expect(settings.echoCancellation).toBe(true);
		});

		it('should get audio devices correctly', async () => {
			const devices = await voiceClient.getAudioDevices();

			expect(devices).toHaveLength(2);
			expect(devices[0].kind).toBe('audioinput');
			expect(devices[1].kind).toBe('audiooutput');
		});
	});

	describe('Voice State Management', () => {
		it('should handle mute/unmute correctly', () => {
			voiceClient.setMuted(true);
			expect(voiceClient.getState().isMuted).toBe(true);

			voiceClient.setMuted(false);
			expect(voiceClient.getState().isMuted).toBe(false);
		});

		it('should handle deafen/undeafen correctly', () => {
			voiceClient.setDeafened(true);
			expect(voiceClient.getState().isDeafened).toBe(true);

			voiceClient.setDeafened(false);
			expect(voiceClient.getState().isDeafened).toBe(false);
		});

		it('should track initial connection state correctly', () => {
			expect(voiceClient.getState().isConnected).toBe(false);
			expect(voiceClient.getState().currentChannelId).toBeNull();
		});
	});

	describe('Voice Activity Detection', () => {
		it('should setup voice activity detection correctly', async () => {
			// Mock high audio levels
			const mockAnalyser = {
				connect: vi.fn(),
				disconnect: vi.fn(),
				getByteFrequencyData: vi.fn().mockImplementation((array) => {
					for (let i = 0; i < array.length; i++) {
						array[i] = 200 + Math.random() * 55; // High levels
					}
				}),
				frequencyBinCount: 256
			};

			mockAudioContext.createAnalyser.mockReturnValue(mockAnalyser);

			// Test voice activity detection setup
			const stream = mockMediaStream as any;
			voiceClient['setupVoiceActivityDetection'](stream);

			// Verify analyser was created
			expect(mockAudioContext.createAnalyser).toHaveBeenCalled();
		});

		it('should cleanup voice activity detection correctly', () => {
			// Setup voice activity detection first
			const mockAnalyser = {
				connect: vi.fn(),
				disconnect: vi.fn(),
				getByteFrequencyData: vi.fn(),
				frequencyBinCount: 256
			};

			mockAudioContext.createAnalyser.mockReturnValue(mockAnalyser);

			const stream = mockMediaStream as any;
			voiceClient['setupVoiceActivityDetection'](stream);

			// Now cleanup
			voiceClient['cleanupVoiceActivityDetection']();

			// Verify cleanup
			expect(voiceClient.getState().isSpeaking).toBe(false);
		});
	});

	describe('Error Handling', () => {
		it('should handle media device permission errors', async () => {
			// Mock getUserMedia to reject
			navigator.mediaDevices.getUserMedia = vi.fn().mockRejectedValue(
				new Error('Permission denied')
			);

			await expect(voiceClient['startLocalStream']()).rejects.toThrow('Permission denied');
		});

		it('should handle WebSocket connection errors gracefully', async () => {
			// Mock WebSocket to throw error
			const mockErrorWebSocket = {
				readyState: 3, // CLOSED
				send: vi.fn(),
				close: vi.fn(),
				addEventListener: vi.fn((event, handler) => {
					if (event === 'error') {
						setTimeout(() => handler(new Error('Connection failed')), 0);
					}
				}),
				removeEventListener: vi.fn()
			};

			(global.WebSocket as any) = vi.fn(() => mockErrorWebSocket);

			// The connect method should handle the error gracefully
			await voiceClient.connect('test-token');
			
			// Verify that the error was handled (no exception thrown)
			expect(voiceClient.getState().isConnected).toBe(false);
		});
	});

	describe('Voice Client Utilities', () => {
		it('should create peer connections correctly', () => {
			const peerId = 'test-peer-1';
			const peerConnection = voiceClient['createPeerConnection'](peerId);

			expect(RTCPeerConnection).toHaveBeenCalled();
			expect(voiceClient['peers'].has(peerId)).toBe(true);
		});

		it('should remove peer connections correctly', () => {
			const peerId = 'test-peer-1';
			
			// Create a peer first
			voiceClient['createPeerConnection'](peerId);
			expect(voiceClient['peers'].has(peerId)).toBe(true);

			// Remove the peer
			voiceClient['removePeerConnection'](peerId);
			expect(voiceClient['peers'].has(peerId)).toBe(false);
		});

		it('should handle audio autoplay correctly', () => {
			// Mock user interaction
			const mockEvent = new Event('click');
			document.dispatchEvent(mockEvent);

			// Test audio autoplay handling
			voiceClient.handleAudioAutoplay();

			// Verify no errors occurred
			expect(true).toBe(true); // Just checking it doesn't throw
		});
	});

	describe('Voice Message Handling', () => {
		it('should handle connected messages correctly', () => {
			const message = {
				type: 'connected',
				user_id: 1,
				username: 'testuser'
			};

			voiceClient['handleConnected'](message);

			const state = voiceClient.getState();
			expect(state.isRegistered).toBe(true);
		});

		it('should handle channel joined messages correctly', async () => {
			const message = {
				type: 'channel-joined',
				data: {
					channel_id: 1,
					server_id: 1,
					clients: []
				}
			};

			await voiceClient['handleChannelJoined'](message);

			const state = voiceClient.getState();
			expect(state.currentChannelId).toBe(1);
			expect(state.isConnected).toBe(true);
		});

		it('should handle user joined messages correctly', async () => {
			const message = {
				type: 'user-joined',
				user_id: 2,
				username: 'testuser2',
				channel_id: 1
			};

			await voiceClient['handleUserJoined'](message);

			// Verify that a peer connection was created
			expect(RTCPeerConnection).toHaveBeenCalled();
		});
	});
}); 