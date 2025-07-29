import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import type { User, AuthResponse } from '$lib/types';
import { apiClient, ApiError } from '$lib/api/client';
import { wsClient } from '$lib/api/websocket';
import { getStorageItem, removeStorageItem } from '$lib/utils';

// Auth state interface
interface AuthState {
	user: User | null;
	token: string | null;
	isLoading: boolean;
	error: string | null;
	isInitialized: boolean;
}

// Initial state
const initialState: AuthState = {
	user: null,
	token: null,
	isLoading: false,
	error: null,
	isInitialized: false
};

// Create writable store
export const authStore = writable<AuthState>(initialState);

// Derived stores for convenience
export const currentUser = derived(authStore, ($auth) => $auth.user);
export const isAuthenticated = derived(authStore, ($auth) => !!$auth.user && !!$auth.token);
export const isLoading = derived(authStore, ($auth) => $auth.isLoading);
export const authError = derived(authStore, ($auth) => $auth.error);

// Auth actions
export const authActions = {
	// Initialize auth state from localStorage
	async initialize(): Promise<void> {
		if (!browser) return;

		authStore.update(state => ({ ...state, isLoading: true }));

		try {
			const token = localStorage.getItem('token');
			
			if (token) {
				// Verify token is still valid by fetching current user
				const user = await apiClient.getCurrentUser();
				
				authStore.update(state => ({
					...state,
					user,
					token,
					isLoading: false,
					error: null,
					isInitialized: true
				}));

				// Connect WebSocket
				await wsClient.connect(token);
			} else {
				authStore.update(state => ({
					...state,
					isLoading: false,
					isInitialized: true
				}));
			}
		} catch (error) {
			console.error('Auth initialization failed:', error);
			
			// Clear invalid token
			apiClient.clearToken();
			
			authStore.update(state => ({
				...state,
				user: null,
				token: null,
				isLoading: false,
				error: error instanceof ApiError ? error.message : 'Authentication failed',
				isInitialized: true
			}));
		}
	},

	// Login user
	async login(username: string, password: string): Promise<void> {
		authStore.update(state => ({ ...state, isLoading: true, error: null }));

		try {
			const authResponse: AuthResponse = await apiClient.login({ username, password });
			
			authStore.update(state => ({
				...state,
				user: authResponse.user,
				token: authResponse.token,
				isLoading: false,
				error: null
			}));

			// Connect WebSocket
			await wsClient.connect(authResponse.token);
		} catch (error) {
			const errorMessage = error instanceof ApiError ? error.message : 'Login failed';
			
			authStore.update(state => ({
				...state,
				user: null,
				token: null,
				isLoading: false,
				error: errorMessage
			}));

			throw error;
		}
	},

	// Register user
	async register(username: string, email: string, password: string): Promise<void> {
		authStore.update(state => ({ ...state, isLoading: true, error: null }));

		try {
			const authResponse: AuthResponse = await apiClient.register({ username, email, password });
			
			authStore.update(state => ({
				...state,
				user: authResponse.user,
				token: authResponse.token,
				isLoading: false,
				error: null
			}));

			// Connect WebSocket
			await wsClient.connect(authResponse.token);
		} catch (error) {
			const errorMessage = error instanceof ApiError ? error.message : 'Registration failed';
			
			authStore.update(state => ({
				...state,
				user: null,
				token: null,
				isLoading: false,
				error: errorMessage
			}));

			throw error;
		}
	},

	// Logout user
	async logout(): Promise<void> {
		authStore.update(state => ({ ...state, isLoading: true }));

		try {
			// Disconnect WebSocket
			wsClient.disconnect();
			
			// Call API logout
			await apiClient.logout();
		} catch (error) {
			console.warn('Logout API call failed:', error);
		} finally {
					// Clear local state regardless of API call result
		localStorage.removeItem('token');
		authStore.update(state => ({
			...state,
			user: null,
			token: null,
			isLoading: false,
			error: null
		}));
		}
	},

	// Refresh token
	async refreshToken(): Promise<void> {
		try {
			const authResponse: AuthResponse = await apiClient.refreshToken();
			
			authStore.update(state => ({
				...state,
				user: authResponse.user,
				token: authResponse.token,
				error: null
			}));
		} catch (error) {
			console.error('Token refresh failed:', error);
			
			// If refresh fails, logout user
			await this.logout();
			throw error;
		}
	},

	// Update user data
	updateUser(user: User): void {
		authStore.update(state => ({
			...state,
			user
		}));
	},

	// Clear error
	clearError(): void {
		authStore.update(state => ({
			...state,
			error: null
		}));
	}
};

// Auto-initialize when store is created
if (browser) {
	authActions.initialize();
}