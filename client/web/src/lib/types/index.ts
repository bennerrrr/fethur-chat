// Core entity types
export interface User {
	id: number;
	username: string;
	email: string;
	avatar?: string;
	isOnline: boolean;
	lastSeen?: Date;
	createdAt: Date;
}

export interface Server {
	id: number;
	name: string;
	description?: string;
	icon?: string;
	ownerId: number;
	memberCount: number;
	channels: Channel[];
	createdAt: Date;
}

export interface Channel {
	id: number;
	name: string;
	description?: string;
	type: 'text' | 'voice';
	serverId: number;
	position: number;
	createdAt: Date;
}

export interface Message {
	id: number;
	content: string;
	authorId: number;
	author: User;
	channelId: number;
	createdAt: Date;
	updatedAt?: Date;
	isEdited: boolean;
}

// API response types
export interface ApiResponse<T = any> {
	success: boolean;
	data?: T;
	error?: string;
	message?: string;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
	hasMore: boolean;
}

// Authentication types
export interface LoginRequest {
	username: string;
	password: string;
}

export interface RegisterRequest {
	username: string;
	email: string;
	password: string;
}

export interface AuthResponse {
	token: string;
	user: User;
	expiresAt: Date;
}

// WebSocket event types
export interface TypingEvent {
	userId: number;
	channelId: number;
	username: string;
	isTyping: boolean;
}

export interface MessageEvent {
	type: 'message_created' | 'message_updated' | 'message_deleted';
	message: Message;
}

export interface UserEvent {
	type: 'user_joined' | 'user_left' | 'user_online' | 'user_offline';
	user: User;
	serverId?: number;
}

export type WebSocketEvent = MessageEvent | UserEvent | TypingEvent;

// UI state types
export interface AppState {
	currentUser: User | null;
	currentServer: Server | null;
	currentChannel: Channel | null;
	isConnected: boolean;
	isLoading: boolean;
}

export interface ChatState {
	messages: Message[];
	typingUsers: TypingEvent[];
	isLoadingMessages: boolean;
	hasMoreMessages: boolean;
}

// Environment configuration
export interface Config {
	apiUrl: string;
	wsUrl: string;
	devMode: boolean;
	logLevel: 'debug' | 'info' | 'warn' | 'error';
}