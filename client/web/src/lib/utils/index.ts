const browser = typeof window !== 'undefined';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind class name utility
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Date utilities
export function formatDate(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

export function formatTime(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleTimeString('en-US', {
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function formatDateTime(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export function isToday(date: Date | string): boolean {
	const d = typeof date === 'string' ? new Date(date) : date;
	const today = new Date();
	return d.toDateString() === today.toDateString();
}

export function isYesterday(date: Date | string): boolean {
	const d = typeof date === 'string' ? new Date(date) : date;
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	return d.toDateString() === yesterday.toDateString();
}

export function getRelativeTime(date: Date | string): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - d.getTime()) / 1000);

	if (diffInSeconds < 60) {
		return 'just now';
	}

	const diffInMinutes = Math.floor(diffInSeconds / 60);
	if (diffInMinutes < 60) {
		return `${diffInMinutes}m ago`;
	}

	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24) {
		return `${diffInHours}h ago`;
	}

	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays < 7) {
		return `${diffInDays}d ago`;
	}

	return formatDate(d);
}

// String utilities
export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength) + '...';
}

export function capitalizeFirst(text: string): string {
	return text.charAt(0).toUpperCase() + text.slice(1);
}

export function generateId(): string {
	return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function sanitizeInput(input: string): string {
	return input
		.replace(/[<>]/g, '') // Remove potential HTML tags
		.trim();
}

// Error handling
export function getErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === 'string') {
		return error;
	}
	return 'An unexpected error occurred';
}

// Local storage utilities
export function setStorageItem<T>(key: string, value: T): void {
	if (!browser) return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		// Handle storage errors silently
	}
}

export function getStorageItem<T>(key: string, defaultValue?: T): T | null {
	if (!browser) return defaultValue ?? null;
	try {
		const item = localStorage.getItem(key);
		return item ? JSON.parse(item) : defaultValue ?? null;
	} catch (error) {
		return defaultValue ?? null;
	}
}

export function removeStorageItem(key: string): void {
	if (!browser) return;
	try {
		localStorage.removeItem(key);
	} catch (error) {
		// Handle storage errors silently
	}
}

export function clearStorage(): void {
	if (!browser) return;
	try {
		localStorage.clear();
	} catch (error) {
		// Handle storage errors silently
	}
}

// Debounce utility
export function debounce<T extends (...args: unknown[]) => unknown>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: NodeJS.Timeout;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

// Throttle utility
export function throttle<T extends (...args: unknown[]) => unknown>(
	func: T,
	limit: number
): (...args: Parameters<T>) => void {
	let inThrottle: boolean;
	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

// Validation utilities
export function isValidEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function isValidUsername(username: string): boolean {
	const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
	return usernameRegex.test(username);
}

export function isValidPassword(password: string): boolean {
	return password.length >= 8;
}

// URL utilities
export function getQueryParam(param: string): string | null {
	if (!browser) return null;
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get(param);
}

export function setQueryParam(param: string, value: string): void {
	if (!browser) return;
	const url = new URL(window.location.href);
	url.searchParams.set(param, value);
	window.history.replaceState({}, '', url.toString());
}

export function removeQueryParam(param: string): void {
	if (!browser) return;
	const url = new URL(window.location.href);
	url.searchParams.delete(param);
	window.history.replaceState({}, '', url.toString());
}

// Array utilities
export function groupBy<T, K extends string | number>(
	array: T[],
	keyFn: (item: T) => K
): Record<K, T[]> {
	return array.reduce((groups, item) => {
		const key = keyFn(item);
		if (!groups[key]) {
			groups[key] = [];
		}
		groups[key].push(item);
		return groups;
	}, {} as Record<K, T[]>);
}

export function uniqueBy<T, K>(array: T[], keyFn: (item: T) => K): T[] {
	const seen = new Set<K>();
	return array.filter(item => {
		const key = keyFn(item);
		if (seen.has(key)) {
			return false;
		}
		seen.add(key);
		return true;
	});
}

// Color utilities
export function getContrastColor(hexColor: string): string {
	const r = parseInt(hexColor.slice(1, 3), 16);
	const g = parseInt(hexColor.slice(3, 5), 16);
	const b = parseInt(hexColor.slice(5, 7), 16);
	const brightness = (r * 299 + g * 587 + b * 114) / 1000;
	return brightness > 128 ? '#000000' : '#ffffff';
}

// File utilities
export function formatFileSize(bytes: number): string {
	if (bytes === 0) return '0 Bytes';
	const k = 1024;
	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileExtension(filename: string): string {
	return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

export function isValidFileType(file: File, allowedTypes: string[]): boolean {
	return allowedTypes.includes(file.type);
}

export function isValidFileSize(file: File, maxSizeInMB: number): boolean {
	return file.size <= maxSizeInMB * 1024 * 1024;
}