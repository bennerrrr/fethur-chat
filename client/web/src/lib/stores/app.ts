import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { User, Server, Channel, Message, ChatState, TypingEvent, AppState } from '$lib/types';
import { apiClient, ApiError } from '$lib/api/client';
import { wsClient } from '$lib/api/websocket';

// Helper functions for localStorage persistence
function loadFromStorage<T>(key: string, defaultValue: T): T {
	if (!browser) return defaultValue;
	try {
		const stored = localStorage.getItem(key);
		return stored ? JSON.parse(stored) : defaultValue;
	} catch (error) {
		console.warn(`Failed to load ${key} from localStorage:`, error);
		return defaultValue;
	}
}

function saveToStorage<T>(key: string, value: T): void {
	if (!browser) return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.warn(`Failed to save ${key} to localStorage:`, error);
	}
}

// Load persisted state
const persistedState = loadFromStorage('app_state', {
	currentServerId: null as number | null,
	currentChannelId: null as number | null
});

// Initial app state
const initialState: AppState = {
	currentUser: null,
	currentServer: null,
	currentChannel: null,
	servers: [],
	isConnected: false,
	isLoading: false
};

const initialChatState: ChatState = {
	messages: [],
	typingUsers: [],
	isLoadingMessages: false,
	hasMoreMessages: true,
	replyingTo: null,
	selectedMessage: null,
	currentChannelId: undefined
};

// Create app store
export const appStore = writable<AppState>(initialState);

// Create stores
export const chatStore = writable<ChatState>(initialChatState);

// Derived stores for easier access
export const currentUser = derived(appStore, ($app) => $app.currentUser);
export const currentServer = derived(appStore, ($app) => $app.currentServer);
export const currentChannel = derived(appStore, ($app) => $app.currentChannel);
export const servers = derived(appStore, ($app) => $app.servers);
export const isConnected = derived(appStore, ($app) => $app.isConnected);
export const isLoading = derived(appStore, ($app) => $app.isLoading);
export const messages = derived(chatStore, ($chat) => $chat.messages);
export const typingUsers = derived(chatStore, ($chat) => $chat.typingUsers);

// App actions
export const appActions = {
	// Set current user
	setCurrentUser(user: User | null): void {
		appStore.update(state => ({
			...state,
			currentUser: user
		}));
	},

	// Set current server
	setCurrentServer(server: Server | null): void {
		appStore.update(state => ({
			...state,
			currentServer: server,
			currentChannel: null // Clear channel when server changes
		}));
		
		// Persist server selection
		saveToStorage('app_state', {
			...persistedState,
			currentServerId: server?.id || null,
			currentChannelId: null
		});
	},

	// Set current channel
	setCurrentChannel(channel: Channel | null): void {
		appStore.update(state => ({
			...state,
			currentChannel: channel
		}));
		
		// Persist channel selection
		saveToStorage('app_state', {
			...persistedState,
			currentChannelId: channel?.id || null
		});
	},

	// Set servers list
	setServers(serversList: Server[]): void {
		appStore.update(state => ({
			...state,
			servers: serversList
		}));
	},

	// Add server to list
	addServer(server: Server): void {
		appStore.update(state => ({
			...state,
			servers: [...state.servers, server]
		}));
	},

	// Update server in list
	updateServer(serverId: number, updates: Partial<Server>): void {
		appStore.update(state => ({
			...state,
			servers: state.servers.map(server => 
				server.id === serverId ? { ...server, ...updates } : server
			)
		}));
	},

	// Remove server from list
	removeServer(serverId: number): void {
		appStore.update(state => ({
			...state,
			servers: state.servers.filter(server => server.id !== serverId),
			currentServer: state.currentServer?.id === serverId ? null : state.currentServer,
			currentChannel: state.currentChannel?.serverId === serverId ? null : state.currentChannel
		}));
	},

	// Set connection status
	setConnectionStatus(connected: boolean): void {
		appStore.update(state => ({
			...state,
			isConnected: connected
		}));
	},

	// Set loading state
	setLoading(loading: boolean): void {
		appStore.update(state => ({
			...state,
			isLoading: loading
		}));
	},

	// Reset app state (for logout)
	reset(): void {
		appStore.set(initialState);
	},

	// Initialize app with user
	initialize(user: User): void {
		appStore.update(state => ({
			...state,
			currentUser: user
		}));
		
		// Restore persisted state
		this.restorePersistedState();
	},

	// Restore persisted state
	async restorePersistedState(): Promise<void> {
		const persisted = loadFromStorage('app_state', {
			currentServerId: null as number | null,
			currentChannelId: null as number | null
		});
		
		if (persisted.currentServerId) {
			try {
				// Find the server in the current servers list
				const currentState = get(appStore);
				const server = currentState.servers.find(s => s.id === persisted.currentServerId);
				
				if (server) {
					// Load channels for the server
					const channels = await apiClient.getChannels(server.id);
					const serverWithChannels = { ...server, channels };
					
					// Update the server in the store with channels
					this.updateServer(server.id, { channels });
					
					// Set the current server
					this.setCurrentServer(serverWithChannels);
					
					// Restore channel if it exists
					if (persisted.currentChannelId && channels.length > 0) {
						const channel = channels.find(c => c.id === persisted.currentChannelId);
						if (channel) {
							this.setCurrentChannel(channel);
						}
					}
				}
			} catch (error) {
				console.warn('Failed to restore persisted state:', error);
			}
		}
	}
};

// Chat actions
export const chatActions = {
	// Load messages for a channel
	async loadMessages(channelId: number, limit = 50, before?: number): Promise<void> {
		console.log('Loading messages for channel:', channelId);
		chatStore.update(state => ({ 
			...state, 
			isLoadingMessages: true,
			currentChannelId: channelId
		}));

		try {
			const response = await apiClient.getMessages(channelId, 1, limit);
			
			// Handle the actual backend response format
			const messages = response.messages || response.data || [];
			
			chatStore.update(state => ({
				...state,
				messages: before 
					? [...messages.reverse(), ...state.messages]
					: messages.reverse(),
				isLoadingMessages: false,
				hasMoreMessages: response.hasMore || false,
				currentChannelId: channelId
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
	async sendMessage(channelId: number, content: string, replyToId?: number): Promise<void> {
		try {
			// Try WebSocket first for real-time sending
			if (wsClient.isConnected()) {
				wsClient.sendMessage(channelId, content);
			} else {
				// Fallback to HTTP API
				const message = await apiClient.sendMessage(channelId, { content, replyToId });
				this.addMessage(message);
			}
		} catch (error) {
			console.error('Failed to send message:', error);
			throw error;
		}
	},

	// Add message to chat
	addMessage(message: Message): void {
		const currentState = get(chatStore);
		
		// Only add message if it's for the current channel
		if (currentState.currentChannelId === undefined) {
			return;
		}
		
		if (currentState.currentChannelId !== message.channelId) {
			return;
		}
		
		chatStore.update(state => ({
			...state,
			messages: [...state.messages, message].sort((a, b) => 
				new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			)
		}));
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
	},

	// Set current channel ID
	setCurrentChannel(channelId: number): void {
		chatStore.update(state => ({
			...state,
			currentChannelId: channelId
		}));
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

	// Note: Message and typing events are handled in the chat page component
	// to avoid duplicate processing and ensure proper channel filtering
}