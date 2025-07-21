import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind class name utility
export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Date formatting utilities
export function formatMessageTime(date: Date): string {
	const now = new Date();
	const messageDate = new Date(date);
	const diffInMs = now.getTime() - messageDate.getTime();
	const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
	const diffInHours = Math.floor(diffInMinutes / 60);
	const diffInDays = Math.floor(diffInHours / 24);

	if (diffInMinutes < 1) {
		return 'Just now';
	} else if (diffInMinutes < 60) {
		return `${diffInMinutes}m ago`;
	} else if (diffInHours < 24) {
		return `${diffInHours}h ago`;
	} else if (diffInDays < 7) {
		return `${diffInDays}d ago`;
	} else {
		return messageDate.toLocaleDateString();
	}
}

export function formatFullDate(date: Date): string {
	return new Date(date).toLocaleString();
}

// Input validation
export function validateEmail(email: string): boolean {
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return emailRegex.test(email);
}

export function validateUsername(username: string): { valid: boolean; error?: string } {
	if (username.length < 3) {
		return { valid: false, error: 'Username must be at least 3 characters long' };
	}
	if (username.length > 20) {
		return { valid: false, error: 'Username must be less than 20 characters' };
	}
	if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
		return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
	}
	return { valid: true };
}

export function validatePassword(password: string): { valid: boolean; error?: string } {
	if (password.length < 8) {
		return { valid: false, error: 'Password must be at least 8 characters long' };
	}
	if (password.length > 100) {
		return { valid: false, error: 'Password must be less than 100 characters' };
	}
	return { valid: true };
}

// Text utilities
export function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.slice(0, maxLength - 3) + '...';
}

export function sanitizeInput(input: string): string {
	return input.trim().replace(/[<>]/g, '');
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
export function setStorageItem(key: string, value: any): void {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (error) {
		console.error('Failed to save to localStorage:', error);
	}
}

export function getStorageItem<T>(key: string): T | null {
	try {
		const item = localStorage.getItem(key);
		return item ? JSON.parse(item) : null;
	} catch (error) {
		console.error('Failed to read from localStorage:', error);
		return null;
	}
}

export function removeStorageItem(key: string): void {
	try {
		localStorage.removeItem(key);
	} catch (error) {
		console.error('Failed to remove from localStorage:', error);
	}
}

// URL utilities
export function isValidUrl(string: string): boolean {
	try {
		new URL(string);
		return true;
	} catch (_) {
		return false;
	}
}

// Debouncing utility
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	delay: number
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout>;
	return (...args: Parameters<T>) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => func(...args), delay);
	};
}

// Throttling utility
export function throttle<T extends (...args: any[]) => any>(
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