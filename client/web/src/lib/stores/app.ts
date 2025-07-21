import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { Server, Channel, Message, ChatState, TypingEvent } from '$lib/types';
import { apiClient, ApiError } from '$lib/api/client';
import { wsClient } from '$lib/api/websocket';

// App state interface
interface AppState {
	currentServer: Server | null;
	currentChannel: Channel | null;
	servers: Server[];
	isConnected: boolean;
	connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
	error: string | null;
	isLoading: boolean;
}

// Chat state for current channel
interface ChannelChatState extends ChatState {
	channelId: number | null;
}

// Initial states
const initialAppState: AppState = {
	currentServer: null,
	currentChannel: null,
	servers: [],
	isConnected: false,
	connectionStatus: 'disconnected',
	error: null,
	isLoading: false
};

const initialChatState: ChannelChatState = {
	channelId: null,
	messages: [],
	typingUsers: [],
	isLoadingMessages: false,
	hasMoreMessages: true
};

// Create stores
export const appStore = writable<AppState>(initialAppState);
export const chatStore = writable<ChannelChatState>(initialChatState);

// Derived stores
export const currentServer = derived(appStore, ($app) => $app.currentServer);
export const currentChannel = derived(appStore, ($app) => $app.currentChannel);
export const servers = derived(appStore, ($app) => $app.servers);
export const isConnected = derived(appStore, ($app) => $app.isConnected);
export const connectionStatus = derived(appStore, ($app) => $app.connectionStatus);
export const messages = derived(chatStore, ($chat) => $chat.messages);
export const typingUsers = derived(chatStore, ($chat) => $chat.typingUsers);

// App actions
export const appActions = {
	// Load servers
	async loadServers(): Promise<void> {
		appStore.update(state => ({ ...state, isLoading: true, error: null }));

		try {
			const servers = await apiClient.getServers();
			
			appStore.update(state => ({
				...state,
				servers,
				isLoading: false
			}));
		} catch (error) {
			const errorMessage = error instanceof ApiError ? error.message : 'Failed to load servers';
			
			appStore.update(state => ({
				...state,
				error: errorMessage,
				isLoading: false
			}));

			throw error;
		}
	},

	// Set current server
	async setCurrentServer(server: Server | null): Promise<void> {
		appStore.update(state => ({
			...state,
			currentServer: server,
			currentChannel: null // Clear current channel when switching servers
		}));

		// Clear chat state when switching servers
		chatStore.set(initialChatState);

		// Load channels if server is selected
		if (server) {
			try {
				const channels = await apiClient.getChannels(server.id);
				
				appStore.update(state => ({
					...state,
					currentServer: server ? { ...server, channels } : null
				}));
			} catch (error) {
				console.error('Failed to load channels:', error);
			}
		}
	},

	// Set current channel
	async setCurrentChannel(channel: Channel | null): Promise<void> {
		appStore.update(state => ({
			...state,
			currentChannel: channel
		}));

		if (channel) {
			// Load messages for the new channel
			await chatActions.loadMessages(channel.id);
			
			// Join channel via WebSocket
			if (wsClient.isConnected()) {
				wsClient.joinChannel(channel.id);
			}
		} else {
			// Clear chat state if no channel selected
			chatStore.set(initialChatState);
		}
	},

	// Create server
	async createServer(name: string, description?: string): Promise<Server> {
		try {
			const server = await apiClient.createServer({ name, description });
			
			// Add to servers list
			appStore.update(state => ({
				...state,
				servers: [...state.servers, server]
			}));

			return server;
		} catch (error) {
			const errorMessage = error instanceof ApiError ? error.message : 'Failed to create server';
			
			appStore.update(state => ({
				...state,
				error: errorMessage
			}));

			throw error;
		}
	},

	// Create channel
	async createChannel(serverId: number, name: string, type: 'text' | 'voice', description?: string): Promise<Channel> {
		try {
			const channel = await apiClient.createChannel(serverId, { name, type, description });
			
			// Add to current server's channels if it's the active server
			appStore.update(state => {
				if (state.currentServer?.id === serverId) {
					return {
						...state,
						currentServer: {
							...state.currentServer,
							channels: [...state.currentServer.channels, channel]
						}
					};
				}
				return state;
			});

			return channel;
		} catch (error) {
			const errorMessage = error instanceof ApiError ? error.message : 'Failed to create channel';
			
			appStore.update(state => ({
				...state,
				error: errorMessage
			}));

			throw error;
		}
	},

	// Clear error
	clearError(): void {
		appStore.update(state => ({
			...state,
			error: null
		}));
	}
};

// Chat actions
export const chatActions = {
	// Load messages for a channel
	async loadMessages(channelId: number, page = 1): Promise<void> {
		chatStore.update(state => ({ 
			...state, 
			isLoadingMessages: true, 
			channelId: page === 1 ? channelId : state.channelId 
		}));

		try {
			const response = await apiClient.getMessages(channelId, page);
			
			chatStore.update(state => ({
				...state,
				messages: page === 1 ? response.data : [...response.data, ...state.messages],
				isLoadingMessages: false,
				hasMoreMessages: response.hasMore
			}));
		} catch (error) {
			console.error('Failed to load messages:', error);
			
			chatStore.update(state => ({
				...state,
				isLoadingMessages: false
			}));
		}
	},

	// Send message
	async sendMessage(channelId: number, content: string): Promise<void> {
		try {
			// Try WebSocket first for real-time sending
			if (wsClient.isConnected()) {
				wsClient.sendMessage(channelId, content);
			} else {
				// Fallback to HTTP API
				const message = await apiClient.sendMessage(channelId, content);
				this.addMessage(message);
			}
		} catch (error) {
			console.error('Failed to send message:', error);
			throw error;
		}
	},

	// Add message to store (from WebSocket events)
	addMessage(message: Message): void {
		chatStore.update(state => {
			// Only add if it's for the current channel
			if (state.channelId === message.channelId) {
				return {
					...state,
					messages: [...state.messages, message]
				};
			}
			return state;
		});
	},

	// Update typing users
	updateTypingUsers(typingEvent: TypingEvent): void {
		chatStore.update(state => {
			const existingIndex = state.typingUsers.findIndex(
				user => user.userId === typingEvent.userId && user.channelId === typingEvent.channelId
			);

			if (typingEvent.isTyping) {
				// Add or update typing user
				if (existingIndex >= 0) {
					state.typingUsers[existingIndex] = typingEvent;
				} else {
					state.typingUsers.push(typingEvent);
				}
			} else {
				// Remove typing user
				if (existingIndex >= 0) {
					state.typingUsers.splice(existingIndex, 1);
				}
			}

			return {
				...state,
				typingUsers: [...state.typingUsers]
			};
		});
	},

	// Clear chat state
	clearChat(): void {
		chatStore.set(initialChatState);
	}
};

// WebSocket event handlers
if (browser) {
	// Connection status events
	wsClient.on('connected', () => {
		appStore.update(state => ({
			...state,
			isConnected: true,
			connectionStatus: 'connected'
		}));
	});

	wsClient.on('disconnected', () => {
		appStore.update(state => ({
			...state,
			isConnected: false,
			connectionStatus: 'disconnected'
		}));
	});

	wsClient.on('reconnecting', () => {
		appStore.update(state => ({
			...state,
			connectionStatus: 'reconnecting'
		}));
	});

	// Message events
	wsClient.on('message', (event: any) => {
		if (event.type === 'message_created') {
			chatActions.addMessage(event.message);
		}
		// Handle other message events (updated, deleted) here
	});

	// Typing events
	wsClient.on('typing', (event: TypingEvent) => {
		chatActions.updateTypingUsers(event);
	});
}