import { browser } from '$app/environment';
// Use dynamic env import so build doesn't fail if variable is missing
const { PUBLIC_WS_URL } = import.meta.env;
import type { WebSocketEvent, TypingEvent, MessageEvent, UserEvent } from '$lib/types';

const WS_BASE_URL = PUBLIC_WS_URL || 'ws://localhost:8081';

type EventHandler<T = unknown> = (data: T) => void;

interface WebSocketOptions {
	url?: string;
	reconnectDelay?: number;
	maxReconnectAttempts?: number;
	heartbeatInterval?: number;
}

class WebSocketClient {
	private ws: WebSocket | null = null;
	private token: string | null = null;
	private url: string;
	private reconnectDelay: number;
	private maxReconnectAttempts: number;
	private heartbeatInterval: number;
	private reconnectAttempts = 0;
	private reconnectTimer: NodeJS.Timeout | null = null;
	private heartbeatTimer: NodeJS.Timeout | null = null;
	private isManualDisconnect = false;
	private isConnectingState = false;
	private eventHandlers = new Map<string, EventHandler[]>();

	constructor(options: WebSocketOptions = {}) {
		this.url = options.url || WS_BASE_URL;
		this.reconnectDelay = options.reconnectDelay || 1000;
		this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
		this.heartbeatInterval = options.heartbeatInterval || 30000;
	}

	// Connection management
	connect(token: string): Promise<void> {
		if (!browser) {
			return Promise.reject(new Error('WebSocket only available in browser'));
		}

		if (this.ws?.readyState === WebSocket.OPEN) {
			return Promise.resolve();
		}

		this.token = token;
		this.isManualDisconnect = false;

		return new Promise((resolve, reject) => {
			try {
				this.isConnectingState = true;
				const wsUrl = `${this.url}/ws?token=${encodeURIComponent(token)}`;
				this.ws = new WebSocket(wsUrl);

				this.ws.onopen = () => {
					this.isConnectingState = false;
					this.reconnectAttempts = 0;
					this.startHeartbeat();
					this.emit('connected', { timestamp: new Date() });
					resolve();
				};

				this.ws.onmessage = (event) => {
					this.handleMessage(event);
				};

				this.ws.onclose = (event) => {
					this.isConnectingState = false;
					this.stopHeartbeat();
					this.emit('disconnected', { 
						code: event.code, 
						reason: event.reason,
						timestamp: new Date()
					});

					if (!this.isManualDisconnect) {
						this.attemptReconnect();
					}
				};

				this.ws.onerror = (error) => {
					this.isConnectingState = false;
					this.emit('error', { error, timestamp: new Date() });
					reject(new Error('WebSocket connection failed'));
				};

			} catch (error) {
				this.isConnectingState = false;
				reject(error);
			}
		});
	}

	disconnect(): void {
		this.isManualDisconnect = true;
		this.stopHeartbeat();
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.ws) {
			this.ws.close(1000, 'Manual disconnect');
			this.ws = null;
		}
	}

	private attemptReconnect(): void {
		if (this.isManualDisconnect || !this.token) {
			return;
		}

		if (this.reconnectAttempts >= this.maxReconnectAttempts) {
			this.emit('reconnectFailed', { attempts: this.reconnectAttempts });
			return;
		}

		const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
		this.reconnectAttempts++;

		this.reconnectTimer = setTimeout(() => {
			if (!this.isManualDisconnect && this.token) {
				this.emit('reconnecting', { attempt: this.reconnectAttempts });
				this.connect(this.token!).catch(() => {
					// Reconnection failed, will try again
				});
			}
		}, delay);
	}

	private handleMessage(event: MessageEvent): void {
		try {
			const data = JSON.parse(event.data);
			
			// Handle different message types
			switch (data.type) {
				case 'message_created':
				case 'message_updated':
				case 'message_deleted':
					this.emit('message', data as MessageEvent);
					break;
				
				case 'user_joined':
				case 'user_left':
				case 'user_online':
				case 'user_offline':
					this.emit('user', data as UserEvent);
					break;
				
				case 'typing_start':
				case 'typing_stop':
					this.emit('typing', data as TypingEvent);
					break;
				
				case 'heartbeat':
					// Handle heartbeat response
					break;
				
				default:
					this.emit('unknown', data);
					break;
			}
		} catch (error) {
			this.emit('error', { error: 'Failed to parse WebSocket message', timestamp: new Date() });
		}
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeatTimer = setInterval(() => {
			if (this.ws?.readyState === WebSocket.OPEN) {
				this.ws.send(JSON.stringify({ type: 'heartbeat' }));
			}
		}, this.heartbeatInterval);
	}

	private stopHeartbeat(): void {
		if (this.heartbeatTimer) {
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = null;
		}
	}

	// Message sending
	sendMessage(channelId: number, content: string, replyToId?: number): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			const message = {
				type: 'send_message',
				data: {
					channelId,
					content,
					replyToId
				}
			};
			this.ws.send(JSON.stringify(message));
		}
	}

	joinChannel(channelId: number): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			const message = {
				type: 'join_channel',
				data: { channelId }
			};
			this.ws.send(JSON.stringify(message));
		}
	}

	leaveChannel(channelId: number): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			const message = {
				type: 'leave_channel',
				data: { channelId }
			};
			this.ws.send(JSON.stringify(message));
		}
	}

	startTyping(channelId: number): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			const message = {
				type: 'typing_start',
				data: { channelId }
			};
			this.ws.send(JSON.stringify(message));
		}
	}

	stopTyping(channelId: number): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			const message = {
				type: 'typing_stop',
				data: { channelId }
			};
			this.ws.send(JSON.stringify(message));
		}
	}

	// Event handling
	on<T = unknown>(event: string, handler: EventHandler<T>): void {
		if (!this.eventHandlers.has(event)) {
			this.eventHandlers.set(event, []);
		}
		this.eventHandlers.get(event)!.push(handler as EventHandler);
	}

	off(event: string, handler: EventHandler): void {
		const handlers = this.eventHandlers.get(event);
		if (handlers) {
			const index = handlers.indexOf(handler);
			if (index > -1) {
				handlers.splice(index, 1);
			}
		}
	}

	private emit<T = unknown>(event: string, data: T): void {
		const handlers = this.eventHandlers.get(event);
		if (handlers) {
			handlers.forEach(handler => {
				try {
					handler(data);
				} catch (error) {
					// Silently handle event handler errors
				}
			});
		}
	}

	// Status methods
	isConnected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}

	isConnecting(): boolean {
		return this.isConnectingState;
	}

	getReconnectAttempts(): number {
		return this.reconnectAttempts;
	}
}

// Export singleton instance
export const wsClient = new WebSocketClient();