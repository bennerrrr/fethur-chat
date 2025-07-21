import { describe, it, expect } from 'vitest';
import { 
	cn, 
	formatMessageTime, 
	validateEmail, 
	validateUsername, 
	validatePassword,
	truncateText,
	sanitizeInput 
} from './index';

describe('Utility Functions', () => {
	describe('cn (className utility)', () => {
		it('should merge class names correctly', () => {
			expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
		});

		it('should handle conditional classes', () => {
			expect(cn('base-class', true && 'conditional-class')).toBe('base-class conditional-class');
			expect(cn('base-class', false && 'conditional-class')).toBe('base-class');
		});
	});

	describe('formatMessageTime', () => {
		it('should format recent messages as "Just now"', () => {
			const now = new Date();
			expect(formatMessageTime(now)).toBe('Just now');
		});

		it('should format old messages with date', () => {
			const oldDate = new Date('2020-01-01');
			expect(formatMessageTime(oldDate)).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
		});
	});

	describe('validateEmail', () => {
		it('should validate correct email addresses', () => {
			expect(validateEmail('test@example.com')).toBe(true);
			expect(validateEmail('user.name+tag@example.co.uk')).toBe(true);
		});

		it('should reject invalid email addresses', () => {
			expect(validateEmail('invalid-email')).toBe(false);
			expect(validateEmail('test@')).toBe(false);
			expect(validateEmail('@example.com')).toBe(false);
		});
	});

	describe('validateUsername', () => {
		it('should validate correct usernames', () => {
			expect(validateUsername('testuser')).toEqual({ valid: true });
			expect(validateUsername('test_user')).toEqual({ valid: true });
			expect(validateUsername('test-user')).toEqual({ valid: true });
		});

		it('should reject usernames that are too short', () => {
			expect(validateUsername('ab')).toEqual({ 
				valid: false, 
				error: 'Username must be at least 3 characters long' 
			});
		});

		it('should reject usernames with invalid characters', () => {
			expect(validateUsername('test user')).toEqual({ 
				valid: false, 
				error: 'Username can only contain letters, numbers, underscores, and hyphens' 
			});
		});
	});

	describe('validatePassword', () => {
		it('should validate strong passwords', () => {
			expect(validatePassword('password123')).toEqual({ valid: true });
		});

		it('should reject passwords that are too short', () => {
			expect(validatePassword('short')).toEqual({ 
				valid: false, 
				error: 'Password must be at least 8 characters long' 
			});
		});
	});

	describe('truncateText', () => {
		it('should truncate long text', () => {
			expect(truncateText('This is a very long text', 10)).toBe('This is...');
		});

		it('should not truncate short text', () => {
			expect(truncateText('Short', 10)).toBe('Short');
		});
	});

	describe('sanitizeInput', () => {
		it('should remove dangerous characters', () => {
			expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
		});

		it('should trim whitespace', () => {
			expect(sanitizeInput('  test  ')).toBe('test');
		});
	});
});