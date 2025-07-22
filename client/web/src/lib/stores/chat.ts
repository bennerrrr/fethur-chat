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
	selectedMessage: null
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
		chatStore.update(state => ({
			...state,
			messages: [...state.messages, message].sort((a, b) => 
				new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			)
		}));
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
			const response = await apiClient.sendMessage(channelId, {
				content,
				replyToId
			});
			
			// Clear reply after sending
			if (replyToId) {
				chatActions.clearReply();
			}
			
			return response;
		} catch (error) {
			console.error('Failed to send message:', error);
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
			chatStore.update(state => ({ ...state, isLoadingMessages: true }));
			
			const response = await apiClient.getMessages(channelId, { limit, before });
			
			chatStore.update(state => ({
				...state,
				messages: before 
					? [...response.data.reverse(), ...state.messages]
					: response.data.reverse(),
				hasMoreMessages: response.hasMore,
				isLoadingMessages: false
			}));
		} catch (error) {
			console.error('Failed to load messages:', error);
			chatStore.update(state => ({ ...state, isLoadingMessages: false }));
		}
	},

	// Clear messages (when switching channels)
	clearMessages(): void {
		chatStore.set(initialChatState);
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
	}
};
