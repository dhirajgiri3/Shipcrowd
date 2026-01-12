import { describe, it, expect } from '@jest/globals';
import {
    stripHtml,
    sanitizeInput,
    sanitizeObject,
    sanitizeSql,
    sanitizeNoSql,
    sanitizePath,
} from '../../src/shared/utils/sanitize';

describe('Sanitization Utilities', () => {
    describe('stripHtml', () => {
        it('should remove all HTML tags', () => {
            const input = '<script>alert("xss")</script>Hello<b>World</b>';
            const result = stripHtml(input);
            expect(result).toBe('HelloWorld');
        });

        it('should handle empty string', () => {
            expect(stripHtml('')).toBe('');
        });

        it('should handle string without HTML', () => {
            expect(stripHtml('Hello World')).toBe('Hello World');
        });
    });

    describe('sanitizeInput', () => {
        it('should strip HTML by default', () => {
            const input = '<p>Test</p>';
            const result = sanitizeInput(input);
            expect(result).toBe('Test');
        });

        it('should normalize whitespace', () => {
            const input = '  Hello    World  \n\n  ';
            const result = sanitizeInput(input);
            expect(result).toBe('Hello World');
        });

        it('should remove null bytes', () => {
            const input = 'Hello\0World';
            const result = sanitizeInput(input);
            expect(result).toBe('HelloWorld');
        });
    });

    describe('sanitizeObject', () => {
        it('should sanitize all string values', () => {
            const input = {
                name: '<script>alert("xss")</script>John',
                email: '  test@example.com  ',
                nested: {
                    value: '<b>Bold</b>',
                },
            };

            const result = sanitizeObject(input);

            expect(result.name).toBe('John');
            expect(result.email).toBe('test@example.com');
            expect(result.nested.value).toBe('Bold');
        });

        it('should preserve non-string values', () => {
            const input = {
                name: 'John',
                age: 30,
                active: true,
            };

            const result = sanitizeObject(input);

            expect(result.age).toBe(30);
            expect(result.active).toBe(true);
        });
    });

    describe('sanitizeSql', () => {
        it('should remove SQL injection patterns', () => {
            const input = "'; DROP TABLE users--";
            const result = sanitizeSql(input);
            expect(result).not.toContain("'");
            expect(result).not.toContain(';');
            expect(result).not.toContain('--');
        });
    });

    describe('sanitizeNoSql', () => {
        it('should remove MongoDB operators', () => {
            const input = '{ $where: "malicious" }';
            const result = sanitizeNoSql(input);
            expect(result).not.toContain('$where');
            expect(result).not.toContain('{');
            expect(result).not.toContain('}');
        });
    });

    describe('sanitizePath', () => {
        it('should remove path traversal patterns', () => {
            const input = '../../etc/passwd';
            const result = sanitizePath(input);
            expect(result).not.toContain('..');
        });

        it('should normalize slashes', () => {
            const input = 'path///to////file';
            const result = sanitizePath(input);
            expect(result).toBe('path/to/file');
        });
    });
});

describe('Message Constants', () => {
    it('should have auth messages', () => {
        const { AUTH_MESSAGES } = require('../src/shared/constants/messages/auth.messages');
        expect(AUTH_MESSAGES.INVALID_CREDENTIALS).toBeDefined();
        expect(AUTH_MESSAGES.TOKEN_EXPIRED).toBeDefined();
    });

    it('should have validation messages', () => {
        const { VALIDATION_MESSAGES } = require('../src/shared/constants/messages/validation.messages');
        expect(VALIDATION_MESSAGES.INVALID_EMAIL).toBeDefined();
        expect(VALIDATION_MESSAGES.PASSWORD_WEAK).toBeDefined();
    });

    it('should have dynamic messages', () => {
        const { VALIDATION_MESSAGES } = require('../src/shared/constants/messages/validation.messages');
        const message = VALIDATION_MESSAGES.MIN_LENGTH('Password', 8);
        expect(message).toBe('Password must be at least 8 characters.');
    });
});

describe('Validation Schemas', () => {
    it('should validate email', async () => {
        const { emailSchema } = require('../src/shared/validation/schemas/common.schemas');

        await expect(emailSchema.parseAsync('test@example.com')).resolves.toBe('test@example.com');
        await expect(emailSchema.parseAsync('invalid-email')).rejects.toThrow();
    });

    it('should validate phone', async () => {
        const { phoneSchema } = require('../src/shared/validation/schemas/common.schemas');

        await expect(phoneSchema.parseAsync('9876543210')).resolves.toBeDefined();
        await expect(phoneSchema.parseAsync('123')).rejects.toThrow();
    });

    it('should validate PAN', async () => {
        const { panSchema } = require('../src/shared/validation/schemas/common.schemas');

        await expect(panSchema.parseAsync('ABCDE1234F')).resolves.toBe('ABCDE1234F');
        await expect(panSchema.parseAsync('invalid')).rejects.toThrow();
    });
});
