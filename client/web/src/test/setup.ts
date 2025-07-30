import { vi } from 'vitest';
import { beforeAll } from 'vitest';

// Mock browser globals
beforeAll(() => {
	// Mock window.matchMedia
	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockImplementation(query => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(), // deprecated
			removeListener: vi.fn(), // deprecated
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});

	// Mock localStorage
	const localStorageMock = {
		getItem: vi.fn(),
		setItem: vi.fn(),
		removeItem: vi.fn(),
		clear: vi.fn(),
	};
	Object.defineProperty(window, 'localStorage', {
		writable: true,
		value: localStorageMock,
	});

	// Mock WebSocket
	const WebSocketMock = vi.fn().mockImplementation(() => ({
		close: vi.fn(),
		send: vi.fn(),
		readyState: 1,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
	})) as any;
	
	// Add required static properties
	WebSocketMock.CONNECTING = 0;
	WebSocketMock.OPEN = 1;
	WebSocketMock.CLOSING = 2;
	WebSocketMock.CLOSED = 3;
	
	global.WebSocket = WebSocketMock;
});