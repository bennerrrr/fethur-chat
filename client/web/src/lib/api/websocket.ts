import { browser } from '$app/environment';
import { PUBLIC_WS_URL } from '$env/static/public';
import type { WebSocketEvent, TypingEvent, MessageEvent, UserEvent } from '$lib/types';

const WS_BASE_URL = PUBLIC_WS_URL || 'ws://localhost:8081';

type EventHandler<T = any> = (data: T) => void;

interface WebSocketOptions {
	url?: string;
	reconnectDelay?: number;
	maxReconnectAttempts?: number;
	heartbeatInterval?: number;
}

class WebSocketClient {
	private ws: WebSocket | null = null;
	private url: string;
	private token: string | null = null;
	private eventHandlers: Map<string, EventHandler[]> = new Map();
	private reconnectDelay: number;
	private maxReconnectAttempts: number;
	private reconnectAttempts: number = 0;
	private heartbeatInterval: number;
	private heartbeatTimer: NodeJS.Timeout | null = null;
	private reconnectTimer: NodeJS.Timeout | null = null;
	private isConnectingState: boolean = false;
	private isManualDisconnect: boolean = false;

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
					console.log('WebSocket connected');
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
					console.log('WebSocket disconnected:', event.code, event.reason);
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
					console.error('WebSocket error:', error);
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
			console.error('Max reconnection attempts reached');
			this.emit('reconnectFailed', { attempts: this.reconnectAttempts });
			return;
		}

		const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
		this.reconnectAttempts++;

		console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
		
		this.reconnectTimer = setTimeout(() => {
			if (!this.isManualDisconnect && this.token) {
				this.emit('reconnecting', { attempt: this.reconnectAttempts });
				this.connect(this.token).catch(() => {
					// Reconnection failed, will try again
				});
			}
		}, delay);
	}

	private handleMessage(event: any): void {
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
			console.error('Failed to parse WebSocket message:', error);
		}
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.heartbeatTimer = setInterval(() => {
			if (this.ws?.readyState === WebSocket.OPEN) {
				this.send({ type: 'heartbeat', timestamp: Date.now() });
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
	send(data: any): boolean {
		if (this.ws?.readyState === WebSocket.OPEN) {
			try {
				this.ws.send(JSON.stringify(data));
				return true;
			} catch (error) {
				console.error('Failed to send WebSocket message:', error);
				return false;
			}
		}
		return false;
	}

	// Specific message methods
	sendMessage(channelId: number, content: string): boolean {
		return this.send({
			type: 'send_message',
			channelId,
			content,
			timestamp: Date.now()
		});
	}

	startTyping(channelId: number): boolean {
		return this.send({
			type: 'typing_start',
			channelId,
			timestamp: Date.now()
		});
	}

	stopTyping(channelId: number): boolean {
		return this.send({
			type: 'typing_stop',
			channelId,
			timestamp: Date.now()
		});
	}

	joinChannel(channelId: number): boolean {
		return this.send({
			type: 'join_channel',
			channelId,
			timestamp: Date.now()
		});
	}

	leaveChannel(channelId: number): boolean {
		return this.send({
			type: 'leave_channel',
			channelId,
			timestamp: Date.now()
		});
	}

	// Event handling
	on<T = any>(event: string, handler: EventHandler<T>): void {
		if (!this.eventHandlers.has(event)) {
			this.eventHandlers.set(event, []);
		}
		this.eventHandlers.get(event)!.push(handler);
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

	private emit<T = any>(event: string, data: T): void {
		const handlers = this.eventHandlers.get(event);
		if (handlers) {
			handlers.forEach(handler => {
				try {
					handler(data);
				} catch (error) {
					console.error(`Error in event handler for ${event}:`, error);
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

	getReadyState(): number | null {
		return this.ws?.readyState ?? null;
	}

	getReconnectAttempts(): number {
		return this.reconnectAttempts;
	}
}

// Export singleton instance
export const wsClient = new WebSocketClient();
export { WebSocketClient };