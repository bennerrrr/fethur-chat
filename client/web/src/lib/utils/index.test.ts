import { describe, it, expect } from 'vitest';
import { 
	cn, 
	formatTime, 
	isValidEmail,
	isValidUsername,
	isValidPassword,
	truncateText,
	sanitizeInput,
	debounce,
	throttle
} from './index';

describe('Utility Functions', () => {
	describe('cn', () => {
		it('should merge class names correctly', () => {
			expect(cn('class1', 'class2')).toBe('class1 class2');
			expect(cn('class1', false && 'class2', 'class3')).toBe('class1 class3');
		});
	});

	describe('formatTime', () => {
		it('should format time correctly', () => {
			const date = new Date('2023-01-01T12:30:00');
			expect(formatTime(date)).toMatch(/\d{1,2}:\d{2}/);
		});
	});

	describe('isValidEmail', () => {
		it('should validate email correctly', () => {
			expect(isValidEmail('test@example.com')).toBe(true);
			expect(isValidEmail('invalid-email')).toBe(false);
			expect(isValidEmail('')).toBe(false);
		});
	});

	describe('isValidUsername', () => {
		it('should validate username correctly', () => {
			expect(isValidUsername('validuser')).toBe(true);
			expect(isValidUsername('valid_user')).toBe(true);
			expect(isValidUsername('valid-user')).toBe(true);
			expect(isValidUsername('ab')).toBe(false); // too short
			expect(isValidUsername('a'.repeat(21))).toBe(false); // too long
			expect(isValidUsername('invalid@user')).toBe(false); // invalid chars
		});
	});

	describe('isValidPassword', () => {
		it('should validate password correctly', () => {
			expect(isValidPassword('password123')).toBe(true);
			expect(isValidPassword('short')).toBe(false);
		});
	});

	describe('truncateText', () => {
		it('should truncate text correctly', () => {
			expect(truncateText('Hello World', 5)).toBe('Hello...');
			expect(truncateText('Short', 10)).toBe('Short');
		});
	});

	describe('sanitizeInput', () => {
		it('should sanitize input correctly', () => {
			expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
			expect(sanitizeInput('  normal text  ')).toBe('normal text');
		});
	});

	describe('debounce', () => {
		it('should debounce function calls', async () => {
			let callCount = 0;
			const debouncedFn = debounce(() => { callCount++; }, 100);

			debouncedFn();
			debouncedFn();
			debouncedFn();

			expect(callCount).toBe(0);

			await new Promise(resolve => setTimeout(resolve, 150));
			expect(callCount).toBe(1);
		});
	});

	describe('throttle', () => {
		it('should throttle function calls', async () => {
			let callCount = 0;
			const throttledFn = throttle(() => { callCount++; }, 100);

			throttledFn();
			throttledFn();
			throttledFn();

			expect(callCount).toBe(1);

			await new Promise(resolve => setTimeout(resolve, 150));
			throttledFn();
			expect(callCount).toBe(2);
		});
	});
});