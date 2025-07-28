import { browser } from '$app/environment';
import type {
	ApiResponse,
	PaginatedResponse,
	LoginRequest,
	RegisterRequest,
	AuthResponse,
	User,
	Server,
	Channel,
	Message
} from '$lib/types';
import { getStorageItem, setStorageItem, removeStorageItem } from '$lib/utils';

const API_BASE_URL = 'http://localhost:8081';

class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
		public data?: any
	) {
		super(message);
		this.name = 'ApiError';
	}
}

class ApiClient {
	public baseUrl: string;
	private token: string | null = null;

	constructor(baseUrl: string = API_BASE_URL) {
		this.baseUrl = baseUrl;
		
		// Load token from localStorage on client side
		if (browser) {
			this.token = getStorageItem<string>('auth_token');
		}
	}

	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<ApiResponse<T>> {
		const url = `${this.baseUrl}${endpoint}`;
		const headers: Record<string, string> = {
			'Content-Type': 'application/json'
		};
		
		// Add any additional headers
		if (options.headers) {
			Object.assign(headers, options.headers);
		}

		if (this.token) {
			headers['Authorization'] = `Bearer ${this.token}`;
		}

		try {
			const response = await fetch(url, {
				...options,
				headers
			});

			const data = await response.json();

			if (!response.ok) {
				throw new ApiError(response.status, data.error || data.message || 'Request failed', data);
			}

			return data;
		} catch (error) {
			if (error instanceof ApiError) {
				throw error;
			}
			throw new ApiError(0, 'Network error or server unavailable');
		}
	}

	// Authentication methods
	async login(credentials: LoginRequest): Promise<AuthResponse> {
		const response = await this.request<AuthResponse>('/api/auth/login', {
			method: 'POST',
			body: JSON.stringify(credentials)
		});

		if (response.success && response.data) {
			this.setToken(response.data.token);
			return response.data;
		}

		throw new ApiError(401, response.error || 'Login failed');
	}

	async register(userData: RegisterRequest): Promise<AuthResponse> {
		const response = await this.request<AuthResponse>('/api/auth/register', {
			method: 'POST',
			body: JSON.stringify(userData)
		});

		if (response.success && response.data) {
			this.setToken(response.data.token);
			return response.data;
		}

		throw new ApiError(400, response.error || 'Registration failed');
	}

	async logout(): Promise<void> {
		this.clearToken();
		// Optionally call backend logout endpoint
		try {
			await this.request('/api/auth/logout', { method: 'POST' });
		} catch (error) {
			// Ignore logout errors on client side
			console.warn('Logout request failed:', error);
		}
	}

	async refreshToken(): Promise<AuthResponse> {
		const response = await this.request<AuthResponse>('/api/auth/refresh', {
			method: 'POST'
		});

		if (response.success && response.data) {
			this.setToken(response.data.token);
			return response.data;
		}

		throw new ApiError(401, 'Token refresh failed');
	}

	// User methods
	async getCurrentUser(): Promise<User> {
		const response = await this.request<{ data: any; success: boolean }>('/api/auth/me') as any;
		
		// Backend returns { data: {...}, success: true }
		if (response && response.success && response.data) {
			return {
				id: response.data.id,
				username: response.data.username,
				email: response.data.email,
				isOnline: true,
				createdAt: new Date(response.data.created_at || new Date())
			};
		}

		throw new ApiError(401, 'Failed to get current user');
	}

	// Server methods
	async getServers(): Promise<Server[]> {
		const response = await this.request<{ servers: any[] }>('/api/servers') as any;
		
		// Backend returns { servers: [...] } directly
		if (response && response.servers) {
			// Transform backend response to frontend format
			return response.servers.map((server: any) => ({
				id: server.id,
				name: server.name,
				description: server.description,
				icon: server.icon,
				ownerId: server.owner_id,
				memberCount: 0, // Backend doesn't provide this yet
				channels: [], // Will be loaded separately
				createdAt: new Date(server.created_at)
			}));
		}

		throw new ApiError(500, 'Failed to fetch servers');
	}

	async getServer(serverId: number): Promise<Server> {
		const response = await this.request<Server>(`/api/servers/${serverId}`);
		
		if (response.success && response.data) {
			return response.data;
		}

		throw new ApiError(404, 'Server not found');
	}

	async createServer(serverData: { name: string; description?: string }): Promise<Server> {
		const response = await this.request<Server>('/api/servers', {
			method: 'POST',
			body: JSON.stringify(serverData)
		});

		if (response.success && response.data) {
			return response.data;
		}

		throw new ApiError(400, 'Failed to create server');
	}

	// Channel methods
	async getChannels(serverId: number): Promise<Channel[]> {
		const response = await this.request<{ channels: any[] }>(`/api/servers/${serverId}/channels`) as any;
		
		// Backend returns { channels: [...] } directly
		if (response && response.channels) {
			// Transform backend response to frontend format
			return response.channels.map((channel: any) => ({
				id: channel.id,
				name: channel.name,
				description: channel.description,
				type: channel.channel_type,
				serverId: serverId,
				position: 0, // Backend doesn't provide this yet
				createdAt: new Date(channel.created_at)
			}));
		}

		throw new ApiError(500, 'Failed to fetch channels');
	}

	async createChannel(serverId: number, channelData: { name: string; type: 'text' | 'voice'; description?: string }): Promise<Channel> {
		const response = await this.request<Channel>(`/api/servers/${serverId}/channels`, {
			method: 'POST',
			body: JSON.stringify(channelData)
		});

		if (response.success && response.data) {
			return response.data;
		}

		throw new ApiError(400, 'Failed to create channel');
	}

	// Message methods
	async getMessages(channelId: number, options: { limit?: number; before?: number } = {}): Promise<{ data: Message[]; hasMore: boolean }> {
		const params = new URLSearchParams();
		if (options.limit) params.append('limit', options.limit.toString());
		if (options.before) params.append('before', options.before.toString());

		const response = await this.request<{ messages: any[] }>(`/api/channels/${channelId}/messages?${params}`) as any;
		
		// Backend returns { messages: [...] } directly
		if (response && response.messages) {
			// Transform backend response to frontend format
			const messages = response.messages.map((msg: any) => ({
				id: msg.id,
				content: msg.content,
				authorId: msg.user_id || 0,
				author: {
					id: msg.user_id || 0,
					username: msg.username,
					email: '',
					isOnline: true,
					createdAt: new Date()
				},
				channelId: channelId,
				createdAt: new Date(msg.created_at),
				isEdited: false
			}));

			return {
				data: messages,
				hasMore: messages.length === (options.limit || 50)
			};
		}

		throw new ApiError(500, 'Failed to fetch messages');
	}

	async sendMessage(channelId: number, messageData: { content: string; replyToId?: number }): Promise<Message> {
		const response = await this.request<{ data: any }>(`/api/channels/${channelId}/messages`, {
			method: 'POST',
			body: JSON.stringify({ content: messageData.content })
		}) as any;

		if (response.success && response.data) {
			const msg = response.data; // Backend returns { success: true, data: {...} }
			return {
				id: msg.id,
				content: msg.content,
				authorId: msg.user_id,
				author: {
					id: msg.user_id,
					username: msg.username,
					email: '',
					isOnline: true,
					createdAt: new Date()
				},
				channelId: channelId,
				createdAt: new Date(msg.created_at),
				isEdited: false
			};
		}

		throw new ApiError(400, 'Failed to send message');
	}

	// Health check
	async healthCheck(): Promise<{ status: string; message: string }> {
		try {
			const url = `${this.baseUrl}/health`;
			const response = await fetch(url);
			
			if (!response.ok) {
				throw new ApiError(response.status, 'Health check failed');
			}
			
			const data = await response.json();
			return data;
		} catch (error) {
			if (error instanceof ApiError) {
				throw error;
			}
			throw new ApiError(0, 'Network error or server unavailable');
		}
	}

	// Token management
	setToken(token: string): void {
		this.token = token;
		if (browser) {
			setStorageItem('auth_token', token);
		}
	}

	clearToken(): void {
		this.token = null;
		if (browser) {
			removeStorageItem('auth_token');
		}
	}

	getToken(): string | null {
		return this.token;
	}

	isAuthenticated(): boolean {
		return !!this.token;
	}
}

// Export singleton instance
export const apiClient = new ApiClient();
export { ApiError };