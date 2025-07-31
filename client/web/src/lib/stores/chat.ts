import { writable, derived, get } from 'svelte/store';
import type { Message, Reaction, ChatState } from '$lib/types';
import { apiClient } from '$lib/api/client';

// Initial chat state
const initialChatState: ChatState = {
	messages: [],
	typingUsers: [],
	isLoadingMessages: false,
	hasMoreMessages: true,
	replyingTo: null,
	selectedMessage: null,
	currentChannelId: undefined
};

// Create chat store
export const chatStore = writable<ChatState>(initialChatState);

// Derived stores
export const messages = derived(chatStore, ($chat) => $chat.messages);
export const typingUsers = derived(chatStore, ($chat) => $chat.typingUsers);
export const replyingTo = derived(chatStore, ($chat) => $chat.replyingTo);

// Chat actions
export const chatActions = {
	// Add message to store
	addMessage(message: Message): void {
		console.log('🔵 [CHAT STORE] Adding message to store:', {
			messageId: message.id,
			messageChannelId: message.channelId,
			content: message.content.substring(0, 50) + '...'
		});
		
		const currentState = get(chatStore);
		console.log('🔵 [CHAT STORE] Current state:', {
			currentChannelId: currentState.currentChannelId,
			messageCount: currentState.messages.length
		});
		
		// Convert channel IDs to numbers for comparison
		const messageChannelId = Number(message.channelId);
		const currentChannelId = Number(currentState.currentChannelId);
		
		// Only add message if it's for the current channel
		if (currentChannelId !== messageChannelId) {
			console.log('🔴 [CHAT STORE] Message is for different channel, ignoring:', {
				messageChannelId: messageChannelId,
				currentChannelId: currentChannelId,
				messageChannelIdType: typeof message.channelId,
				currentChannelIdType: typeof currentState.currentChannelId
			});
			return;
		}
		
		// Check if message already exists (to prevent duplicates)
		const existingMessage = currentState.messages.find(m => m.id === message.id);
		if (existingMessage) {
			console.log('⚠️ [CHAT STORE] Message already exists, skipping:', message.id);
			return;
		}
		
		console.log('✅ [CHAT STORE] Adding message to current channel');
		chatStore.update(state => {
			const newMessages = [...state.messages, message].sort((a, b) => 
				new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			);
			console.log('✅ [CHAT STORE] Updated messages count:', newMessages.length);
			return {
				...state,
				messages: newMessages
			};
		});
	},

	// Update existing message
	updateMessage(messageId: number, updates: Partial<Message>): void {
		chatStore.update(state => ({
			...state,
			messages: state.messages.map(msg => 
				msg.id === messageId ? { ...msg, ...updates } : msg
			)
		}));
	},

	// Delete message
	deleteMessage(messageId: number): void {
		chatStore.update(state => ({
			...state,
			messages: state.messages.filter(msg => msg.id !== messageId)
		}));
	},

	// Add reaction to message
	addReaction(messageId: number, emoji: string, userId: number): void {
		chatStore.update(state => ({
			...state,
			messages: state.messages.map(msg => {
				if (msg.id === messageId) {
					const reactions = msg.reactions || [];
					const existingReaction = reactions.find(r => r.emoji === emoji);
					
					if (existingReaction) {
						// Add user to existing reaction
						return {
							...msg,
							reactions: reactions.map(r => 
								r.emoji === emoji 
									? { 
										...r, 
										count: r.count + 1,
										users: [...r.users, { id: userId } as any]
									}
									: r
							)
						};
					} else {
						// Create new reaction
						return {
							...msg,
							reactions: [...reactions, {
								id: Date.now(),
								emoji,
								count: 1,
								users: [{ id: userId } as any],
								messageId
							}]
						};
					}
				}
				return msg;
			})
		}));
	},

	// Remove reaction from message
	removeReaction(messageId: number, emoji: string, userId: number): void {
		chatStore.update(state => ({
			...state,
			messages: state.messages.map(msg => {
				if (msg.id === messageId && msg.reactions) {
					return {
						...msg,
						reactions: msg.reactions.map(r => {
							if (r.emoji === emoji) {
								const newUsers = r.users.filter(u => u.id !== userId);
								return {
									...r,
									count: newUsers.length,
									users: newUsers
								};
							}
							return r;
						}).filter(r => r.count > 0)
					};
				}
				return msg;
			})
		}));
	},

	// Set reply target
	setReplyTo(message: Message | null): void {
		chatStore.update(state => ({
			...state,
			replyingTo: message
		}));
	},

	// Clear reply target
	clearReply(): void {
		chatStore.update(state => ({
			...state,
			replyingTo: null
		}));
	},

	// Send message
	async sendMessage(channelId: number, content: string, replyToId?: number): Promise<void> {
		try {
			console.log('📤 [CHAT STORE] Sending message:', {
				channelId,
				content: content.substring(0, 50) + '...',
				replyToId
			});
			
			// Send message via API
			const response = await apiClient.sendMessage(channelId, content, replyToId);
			
			console.log('✅ [CHAT STORE] Message sent successfully, response:', response);
			
			// Add the returned message to the store immediately
			if (response) {
				const message: Message = {
					id: response.id,
					content: response.content,
					channelId: response.channel_id,
					authorId: response.user_id,
					author: {
						id: response.user_id,
						username: response.username
					},
					createdAt: response.created_at,
					updatedAt: response.created_at,
					isEdited: false
				};
				
				console.log('✅ [CHAT STORE] Adding sent message to store:', message);
				chatActions.addMessage(message);
			}
			
			// Clear reply after sending
			if (replyToId) {
				chatActions.clearReply();
			}
		} catch (error) {
			console.error('❌ [CHAT STORE] Failed to send message:', error);
			throw error;
		}
	},

	// Edit message
	async editMessage(messageId: number, content: string): Promise<void> {
		try {
			await apiClient.editMessage(messageId, content);
		} catch (error) {
			console.error('Failed to edit message:', error);
			throw error;
		}
	},

	// Delete message
	async deleteMessageAsync(messageId: number): Promise<void> {
		try {
			await apiClient.deleteMessage(messageId);
		} catch (error) {
			console.error('Failed to delete message:', error);
			throw error;
		}
	},

	// Load messages for channel
	async loadMessages(channelId: number, limit = 50, before?: number): Promise<void> {
		try {
			const currentState = get(chatStore);
			console.log('🔄 [CHAT STORE] Loading messages for channel:', {
				channelId,
				currentChannelId: currentState.currentChannelId,
				existingMessageCount: currentState.messages.length,
				isLoading: currentState.isLoadingMessages,
				before
			});
			
			// Don't reload if already loading for this channel
			if (currentState.isLoadingMessages && currentState.currentChannelId === channelId) {
				console.log('⏭️ [CHAT STORE] Already loading messages for channel, skipping');
				return;
			}
			
			chatStore.update(state => ({ 
				...state, 
				isLoadingMessages: true, 
				currentChannelId: channelId 
			}));
			
			// Use page 1 for initial load, or calculate page based on before parameter
			const page = before ? Math.floor(before / limit) + 1 : 1;
			const response = await apiClient.getMessages(channelId, page, limit);
			
			// Add safety checks for response structure
			if (!response || !response.messages) {
				console.error('❌ [CHAT STORE] Invalid response structure:', response);
				chatStore.update(state => ({ ...state, isLoadingMessages: false }));
				return;
			}
			
			console.log('✅ [CHAT STORE] Loaded', response.messages.length, 'messages for channel', channelId);
			chatStore.update(state => ({
				...state,
				messages: before 
					? [...response.messages.reverse(), ...state.messages]
					: response.messages.reverse(),
				hasMoreMessages: response.messages.length === limit,
				isLoadingMessages: false,
				currentChannelId: channelId
			}));
			
			const updatedState = get(chatStore);
			console.log('✅ [CHAT STORE] Final message count:', updatedState.messages.length);
		} catch (error) {
			console.error('❌ [CHAT STORE] Failed to load messages:', error);
			chatStore.update(state => ({ ...state, isLoadingMessages: false }));
		}
	},

	// Clear messages (when switching channels)
	clearMessages(): void {
		const currentState = get(chatStore);
		console.log('🧹 [CHAT STORE] Clearing messages and resetting chat state');
		console.log('🧹 [CHAT STORE] Preserving currentChannelId:', currentState.currentChannelId);
		
		chatStore.update(state => ({
			...initialChatState,
			currentChannelId: currentState.currentChannelId // Preserve the current channel ID
		}));
	},

	// Add typing indicator
	addTypingUser(userId: number, channelId: number, username: string): void {
		chatStore.update(state => ({
			...state,
			typingUsers: [
				...state.typingUsers.filter(t => t.userId !== userId),
				{ userId, channelId, username, isTyping: true }
			]
		}));
	},

	// Remove typing indicator
	removeTypingUser(userId: number): void {
		chatStore.update(state => ({
			...state,
			typingUsers: state.typingUsers.filter(t => t.userId !== userId)
		}));
	},

	// Set current channel ID
	setCurrentChannel(channelId: number): void {
		const currentState = get(chatStore);
		console.log('🎯 [CHAT STORE] Setting current channel ID:', {
			oldChannelId: currentState.currentChannelId,
			newChannelId: channelId,
			oldChannelIdType: typeof currentState.currentChannelId,
			newChannelIdType: typeof channelId
		});
		
		chatStore.update(state => ({
			...state,
			currentChannelId: channelId
		}));
		
		// Verify the update
		const updatedState = get(chatStore);
		console.log('✅ [CHAT STORE] Channel ID updated successfully:', {
			currentChannelId: updatedState.currentChannelId,
			currentChannelIdType: typeof updatedState.currentChannelId
		});
	}
};
