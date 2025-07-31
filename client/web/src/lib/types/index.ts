// Core entity types
export interface User {
	id: number;
	username: string;
	email: string;
	avatar?: string;
	role?: string;
	isOnline: boolean;
	lastSeen?: Date;
	createdAt: Date;
	updatedAt?: Date;
	messageCount?: number;
	serverCount?: number;
}

export interface Server {
	id: number;
	name: string;
	description?: string;
	icon?: string;
	ownerId: number;
	memberCount: number;
	channels: Channel[];
	members?: User[];
	createdAt: Date;
	updatedAt?: Date;
}

export interface Channel {
	id: number;
	name: string;
	description?: string;
	type: 'text' | 'voice';
	serverId: number;
	position: number;
	createdAt: Date;
	updatedAt?: Date;
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
	// Enhanced chat features
	replyToId?: number;
	replyTo?: Message;
	reactions?: Reaction[];
	attachments?: Attachment[];
}

export interface Reaction {
	id: number;
	emoji: string;
	count: number;
	users: number[];
}

export interface Attachment {
	id: number;
	filename: string;
	url: string;
	size: number;
	type: string;
	uploadedAt: Date;
}

// API response types
export interface ApiResponse<T> {
	success: boolean;
	data: T;
	message?: string;
	error?: string;
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
	expiresAt?: Date;
}

// WebSocket event types
export interface WebSocketEvent {
	type: string;
	timestamp: Date;
}

export interface MessageEvent extends WebSocketEvent {
	type: 'message_created' | 'message_updated' | 'message_deleted';
	data: Message;
}

export interface UserEvent extends WebSocketEvent {
	type: 'user_joined' | 'user_left' | 'user_online' | 'user_offline';
	data: User;
}

export interface TypingEvent extends WebSocketEvent {
	type: 'typing_start' | 'typing_stop';
	data: {
		userId: number;
		username: string;
		channelId: number;
	};
}

// Voice types
export interface VoiceConnection {
	id: number;
	channelId?: number;
	isConnected: boolean;
	isMuted: boolean;
	isDeafened: boolean;
	participants: VoiceParticipant[];
}

export interface VoiceParticipant {
	id: number;
	username: string;
	isMuted: boolean;
	isDeafened: boolean;
	isSpeaking: boolean;
	volume: number;
	connectionQuality?: 'excellent' | 'good' | 'poor';
}

export interface VoiceStore {
	currentConnection: VoiceConnection | null;
	isConnecting: boolean;
	error: string | null;
	devices: {
		audioInput: MediaDeviceInfo[];
		audioOutput: MediaDeviceInfo[];
	};
	settings: {
		inputDeviceId: string | null;
		outputDeviceId: string | null;
		inputVolume: number;
		outputVolume: number;
		echoCancellation: boolean;
		noiseSuppression: boolean;
		autoGainControl: boolean;
		voiceActivityDetection: boolean;
		pushToTalk: boolean;
		pushToTalkKey: string;
	};
}

// Chat types
export interface ChatState {
	messages: Message[];
	typingUsers: TypingUser[];
	isLoading: boolean;
	isLoadingMessages?: boolean;
	hasMore: boolean;
	hasMoreMessages?: boolean;
	error: string | null;
	currentChannelId?: number;
}

export interface TypingUser {
	userId: number;
	username: string;
	startedAt: Date;
}

// App state types
export interface AppState {
	currentUser: User | null;
	currentServer: Server | null;
	currentChannel: Channel | null;
	servers: Server[];
	isConnected: boolean;
	isLoading: boolean;
}

// Form types
export interface LoginForm {
	username: string;
	password: string;
}

export interface RegisterForm {
	username: string;
	email: string;
	password: string;
	confirmPassword: string;
}

export interface ServerForm {
	name: string;
	description: string;
}

export interface ChannelForm {
	name: string;
	description: string;
	type: 'text' | 'voice';
}

export interface MessageForm {
	content: string;
	replyToId?: number;
}

// Error types
export interface ApiError {
	status: number;
	message: string;
	data?: unknown;
}

// Settings types
export interface UserSettings {
	theme: 'light' | 'dark' | 'system';
	language: string;
	notifications: {
		enabled: boolean;
		sound: boolean;
		desktop: boolean;
	};
	privacy: {
		showOnlineStatus: boolean;
		allowDirectMessages: boolean;
	};
}

export interface ServerSettings {
	name: string;
	description: string;
	icon?: string;
	permissions: {
		allowInvites: boolean;
		requireVerification: boolean;
	};
}

// Notification types
export interface Notification {
	id: string;
	type: 'info' | 'success' | 'warning' | 'error';
	title: string;
	message: string;
	duration?: number;
	action?: {
		label: string;
		callback: () => void;
	};
}

// Search types
export interface SearchResult {
	type: 'message' | 'user' | 'channel' | 'server';
	data: Message | User | Channel | Server;
	score: number;
}

export interface SearchOptions {
	query: string;
	type?: 'message' | 'user' | 'channel' | 'server';
	limit?: number;
	serverId?: number;
	channelId?: number;
}

// File upload types
export interface FileUpload {
	id: string;
	file: File;
	progress: number;
	status: 'pending' | 'uploading' | 'completed' | 'error';
	url?: string;
	error?: string;
}

// Modal types
export interface ModalState {
	isOpen: boolean;
	type: string;
	data?: unknown;
}

// Route types
export interface RouteParams {
	serverId?: string;
	channelId?: string;
	messageId?: string;
}

// Event types
export interface AppEvent {
	type: string;
	data?: unknown;
	timestamp: Date;
}

// Performance types
export interface PerformanceMetrics {
	loadTime: number;
	renderTime: number;
	memoryUsage: number;
	networkRequests: number;
}

// Debug types
export interface DebugInfo {
	token: string | null;
	backendHealth: string | null;
	user: User | null;
	servers: Server[] | null;
	error: string | null;
}