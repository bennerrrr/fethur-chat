import { browser } from '$app/environment';
import { PUBLIC_API_URL } from '$env/static/public';
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

const API_BASE_URL = PUBLIC_API_URL || 'http://localhost:8080';

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
	private baseUrl: string;
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
		const response = await this.request<User>('/api/auth/me');
		
		if (response.success && response.data) {
			return response.data;
		}

		throw new ApiError(401, 'Failed to get current user');
	}

	// Server methods
	async getServers(): Promise<Server[]> {
		const response = await this.request<Server[]>('/api/servers');
		
		if (response.success && response.data) {
			return response.data;
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
		const response = await this.request<Channel[]>(`/api/servers/${serverId}/channels`);
		
		if (response.success && response.data) {
			return response.data;
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
	async getMessages(channelId: number, page = 1, limit = 50): Promise<PaginatedResponse<Message>> {
		const params = new URLSearchParams({
			page: page.toString(),
			limit: limit.toString()
		});

		const response = await this.request<PaginatedResponse<Message>>(`/api/channels/${channelId}/messages?${params}`);
		
		if (response.success && response.data) {
			return response.data;
		}

		throw new ApiError(500, 'Failed to fetch messages');
	}

	async sendMessage(channelId: number, content: string): Promise<Message> {
		const response = await this.request<Message>(`/api/channels/${channelId}/messages`, {
			method: 'POST',
			body: JSON.stringify({ content })
		});

		if (response.success && response.data) {
			return response.data;
		}

		throw new ApiError(400, 'Failed to send message');
	}

	// Health check
	async healthCheck(): Promise<{ status: string; timestamp: string }> {
		const response = await this.request<{ status: string; timestamp: string }>('/health');
		
		if (response.success && response.data) {
			return response.data;
		}

		throw new ApiError(500, 'Health check failed');
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