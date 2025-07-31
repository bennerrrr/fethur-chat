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

// Use relative URLs in browser to leverage Vite's proxy, fallback to direct URL
const API_BASE_URL = browser ? '' : (import.meta.env.PUBLIC_API_URL || 'http://localhost:8081');

class ApiError extends Error {
	constructor(
		public status: number,
		message: string,
		public data?: unknown
	) {
		super(message);
		this.name = 'ApiError';
	}
}

class ApiClient {
	public baseUrl: string;
	private token: string | null = null;

	constructor(baseUrl?: string) {
		this.baseUrl = baseUrl || API_BASE_URL;
	}

	// Token management
	setToken(token: string): void {
		this.token = token;
	}

	clearToken(): void {
		this.token = null;
	}

	getToken(): string | null {
		return this.token;
	}

	// HTTP request helper
	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		const headers: Record<string, string> = {
			'Content-Type': 'application/json',
			...options.headers as Record<string, string>
		};

		if (this.token) {
			headers.Authorization = `Bearer ${this.token}`;
		}

		const config: RequestInit = {
			...options,
			headers
		};

		try {
			const response = await fetch(url, config);
			
			if (!response.ok) {
				let errorMessage = `HTTP ${response.status}`;
				let errorData: unknown = null;

				try {
					const errorResponse = await response.json();
					errorMessage = errorResponse.message || errorMessage;
					errorData = errorResponse;
				} catch {
					// If error response is not JSON, use status text
					errorMessage = response.statusText || errorMessage;
				}

				throw new ApiError(response.status, errorMessage, errorData);
			}

			// Handle empty responses
			const contentType = response.headers.get('content-type');
			if (contentType && contentType.includes('application/json')) {
				return await response.json();
			}

			return {} as T;
		} catch (error) {
			if (error instanceof ApiError) {
				throw error;
			}
			throw new ApiError(0, 'Network error', error);
		}
	}

	// Authentication endpoints
	async login(credentials: LoginRequest): Promise<AuthResponse> {
		return this.request<AuthResponse>('/api/auth/login', {
			method: 'POST',
			body: JSON.stringify(credentials)
		});
	}

	async register(userData: RegisterRequest): Promise<AuthResponse> {
		return this.request<AuthResponse>('/api/auth/register', {
			method: 'POST',
			body: JSON.stringify(userData)
		});
	}

	async logout(): Promise<void> {
		await this.request<void>('/api/auth/logout', {
			method: 'POST'
		});
	}

	async refreshToken(): Promise<AuthResponse> {
		return this.request<AuthResponse>('/api/auth/refresh', {
			method: 'POST'
		});
	}

	async getCurrentUser(): Promise<User> {
		return this.request<User>('/api/auth/me');
	}

	async guestLogin(): Promise<AuthResponse> {
		return this.request<AuthResponse>('/api/auth/guest', {
			method: 'POST'
		});
	}

	// User endpoints
	async getUserProfile(): Promise<User> {
		return this.request<User>('/api/user/profile');
	}

	async updateUserProfile(updates: Partial<User>): Promise<User> {
		return this.request<User>('/api/user/profile', {
			method: 'PUT',
			body: JSON.stringify(updates)
		});
	}

	// Server endpoints
	async getServers(): Promise<Server[]> {
		const response = await this.request<{ servers: Server[] }>('/api/servers');
		return response.servers;
	}

	async getServer(serverId: number): Promise<Server> {
		return this.request<Server>(`/api/servers/${serverId}`);
	}

	async createServer(serverData: Partial<Server>): Promise<Server> {
		return this.request<Server>('/api/servers', {
			method: 'POST',
			body: JSON.stringify(serverData)
		});
	}

	async updateServer(serverId: number, updates: Partial<Server>): Promise<Server> {
		return this.request<Server>(`/api/servers/${serverId}`, {
			method: 'PUT',
			body: JSON.stringify(updates)
		});
	}

	async deleteServer(serverId: number): Promise<void> {
		await this.request<void>(`/api/servers/${serverId}`, {
			method: 'DELETE'
		});
	}

	// Channel endpoints
	async getChannels(serverId: number): Promise<Channel[]> {
		const response = await this.request<{ channels: any[] }>(`/api/servers/${serverId}/channels`);
		// Map the API response to match the frontend Channel interface
		return response.channels.map(channel => ({
			...channel,
			type: channel.channel_type, // Map channel_type to type
			serverId: serverId
		}));
	}

	async getServerUsers(serverId: number): Promise<User[]> {
		const response = await this.request<{ success: boolean; data: User[] }>(`/api/servers/${serverId}/users`);
		return response.data;
	}

	async createChannel(serverId: number, channelData: Partial<Channel>): Promise<Channel> {
		return this.request<Channel>(`/api/servers/${serverId}/channels`, {
			method: 'POST',
			body: JSON.stringify(channelData)
		});
	}

	async updateChannel(channelId: number, updates: Partial<Channel>): Promise<Channel> {
		return this.request<Channel>(`/api/channels/${channelId}`, {
			method: 'PUT',
			body: JSON.stringify(updates)
		});
	}

	async deleteChannel(channelId: number): Promise<void> {
		await this.request<void>(`/api/channels/${channelId}`, {
			method: 'DELETE'
		});
	}

	// Message endpoints
	async getMessages(
		channelId: number,
		page = 1,
		limit = 50
	): Promise<{ messages: Message[] }> {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: limit.toString()
		});
		return this.request<{ messages: Message[] }>(`/api/channels/${channelId}/messages?${params}`);
	}

	async sendMessage(channelId: number, content: string, replyToId?: number): Promise<Message> {
		const messageData: { content: string; replyToId?: number } = { content };
		if (replyToId) {
			messageData.replyToId = replyToId;
		}

		const response = await this.request<{ success: boolean; message: string; data: any }>(`/api/channels/${channelId}/messages`, {
			method: 'POST',
			body: JSON.stringify(messageData)
		});

		// Return the message data from the response
		return response.data;
	}

	async updateMessage(messageId: number, content: string): Promise<Message> {
		return this.request<Message>(`/api/messages/${messageId}`, {
			method: 'PUT',
			body: JSON.stringify({ content })
		});
	}

	async deleteMessage(messageId: number): Promise<void> {
		await this.request<void>(`/api/messages/${messageId}`, {
			method: 'DELETE'
		});
	}

	// Admin endpoints
	async getUsers(): Promise<User[]> {
		const response = await this.request<{ success: boolean; data: User[] }>('/api/admin/users');
		return response.data;
	}

	async createUser(userData: Partial<User>): Promise<User> {
		return this.request<User>('/api/admin/users', {
			method: 'POST',
			body: JSON.stringify(userData)
		});
	}

	async updateUser(userId: number, updates: Partial<User>): Promise<User> {
		return this.request<User>(`/api/admin/users/${userId}`, {
			method: 'PUT',
			body: JSON.stringify(updates)
		});
	}

	async deleteUser(userId: number): Promise<void> {
		await this.request<void>(`/api/admin/users/${userId}`, {
			method: 'DELETE'
		});
	}

	async updateUserRole(userId: number, role: string): Promise<User> {
		return this.request<User>(`/api/admin/users/${userId}/role`, {
			method: 'POST',
			body: JSON.stringify({ role })
		});
	}

	async kickUser(userId: number, reason?: string): Promise<void> {
		await this.request<void>(`/api/admin/users/${userId}/kick`, {
			method: 'POST',
			body: JSON.stringify({ reason })
		});
	}

	async banUser(userId: number, reason?: string, duration?: number): Promise<void> {
		await this.request<void>(`/api/admin/users/${userId}/ban`, {
			method: 'POST',
			body: JSON.stringify({ reason, duration })
		});
	}

	async muteUser(userId: number, reason?: string, duration?: number): Promise<void> {
		await this.request<void>(`/api/admin/users/${userId}/mute`, {
			method: 'POST',
			body: JSON.stringify({ reason, duration })
		});
	}

	async unbanUser(userId: number): Promise<void> {
		await this.request<void>(`/api/admin/users/${userId}/unban`, {
			method: 'POST'
		});
	}

	async unmuteUser(userId: number): Promise<void> {
		await this.request<void>(`/api/admin/users/${userId}/unmute`, {
			method: 'POST'
		});
	}

	// Health check
	async healthCheck(): Promise<{ status: string; timestamp: string }> {
		return this.request<{ status: string; timestamp: string }>('/health');
	}

	// Admin endpoints
	async getAdminHealth(): Promise<unknown> {
		return this.request<unknown>('/api/admin/health');
	}

	async getMetrics(): Promise<unknown> {
		return this.request<unknown>('/api/admin/metrics');
	}

	async getOnlineUsers(): Promise<unknown[]> {
		return this.request<unknown[]>('/api/admin/users/online');
	}

	async getUserLatency(): Promise<unknown[]> {
		return this.request<unknown[]>('/api/admin/users/latency');
	}

	async getAuditLogs(limit?: number, offset?: number): Promise<unknown[]> {
		const params = new URLSearchParams();
		if (limit) params.append('limit', limit.toString());
		if (offset) params.append('offset', offset.toString());
		return this.request<unknown[]>(`/api/admin/logs?${params}`);
	}
}

// Export singleton instance
export const apiClient = new ApiClient();
export { ApiError };