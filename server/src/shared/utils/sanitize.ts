/**
 * Input Sanitization Utilities
 * Prevents XSS, injection attacks, and other security vulnerabilities
 */

/**
 * Strip HTML tags from input
 * Prevents XSS attacks by removing all HTML tags
 * 
 * @param input - String to sanitize
 * @param allowedTags - Optional array of allowed tags (e.g., ['b', 'i'])
 * @returns Sanitized string
 */
export const stripHtml = (input: string, allowedTags: string[] = []): string => {
    if (!input) return input;

    let sanitized = input;

    if (allowedTags.length === 0) {
        // Remove all HTML tags
        sanitized = sanitized.replace(/<[^>]*>/g, '');
    } else {
        // Remove all tags except allowed ones
        const allowedPattern = allowedTags.join('|');
        const regex = new RegExp(`<(?!\\/?(${allowedPattern})\\b)[^>]*>`, 'gi');
        sanitized = sanitized.replace(regex, '');
    }

    return sanitized;
};

/**
 * Encode special characters to prevent injection attacks
 * 
 * @param input - String to encode
 * @returns Encoded string
 */
export const encodeSpecialChars = (input: string): string => {
    if (!input) return input;

    const htmlEntities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };

    return input.replace(/[&<>"'/]/g, char => htmlEntities[char] || char);
};

/**
 * Trim and normalize whitespace
 * 
 * @param input - String to normalize
 * @returns Normalized string
 */
export const normalizeWhitespace = (input: string): string => {
    if (!input) return input;

    return input
        .trim()
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n+/g, '\n'); // Replace multiple newlines with single newline
};

/**
 * Remove null bytes that could be used in attacks
 * 
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export const removeNullBytes = (input: string): string => {
    if (!input) return input;

    return input.replace(/\0/g, '');
};

/**
 * Sanitize for SQL injection prevention
 * Note: This is a basic sanitizer. Always use parameterized queries!
 * 
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export const sanitizeSql = (input: string): string => {
    if (!input) return input;

    // Remove common SQL injection patterns
    return input
        .replace(/('|(\\')|(;)|(--)|(\/\*)|(\*\/))/g, '')
        .trim();
};

/**
 * Sanitize for NoSQL injection prevention
 * Removes MongoDB operators and special characters
 * 
 * @param input - String to sanitize
 * @returns Sanitized string
 */
export const sanitizeNoSql = (input: string): string => {
    if (!input) return input;

    // Remove MongoDB operators
    return input
        .replace(/\$\w+/g, '') // Remove $where, $regex, etc.
        .replace(/[{}]/g, ''); // Remove braces
};

/**
 * Prevent path traversal attacks
 * 
 * @param input - Path string to sanitize
 * @returns Sanitized path
 */
export const sanitizePath = (input: string): string => {
    if (!input) return input;

    return input
        .replace(/\.\./g, '') // Remove ..
        .replace(/[\/\\]{2,}/g, '/') // Replace multiple slashes
        .replace(/^[\/\\]/, ''); // Remove leading slash
};

/**
 * Comprehensive sanitization for general text input
 * Combines multiple sanitization techniques
 * 
 * @param input - String to sanitize
 * @param options - Sanitization options
 * @returns Sanitized string
 */
export const sanitizeInput = (
    input: string,
    options: {
        stripHtml?: boolean;
        encodeSpecialChars?: boolean;
        normalizeWhitespace?: boolean;
        removeNullBytes?: boolean;
    } = {}
): string => {
    if (!input) return input;

    let sanitized = input;

    const {
        stripHtml: shouldStripHtml = true,
        encodeSpecialChars: shouldEncode = false,
        normalizeWhitespace: shouldNormalize = true,
        removeNullBytes: shouldRemoveNullBytes = true,
    } = options;

    if (shouldRemoveNullBytes) {
        sanitized = removeNullBytes(sanitized);
    }

    if (shouldStripHtml) {
        sanitized = stripHtml(sanitized);
    }

    if (shouldEncode) {
        sanitized = encodeSpecialChars(sanitized);
    }

    if (shouldNormalize) {
        sanitized = normalizeWhitespace(sanitized);
    }

    return sanitized;
};

/**
 * Sanitize object recursively
 * Applies sanitization to all string values in an object
 * 
 * @param obj - Object to sanitize
 * @param options - Sanitization options
 * @returns Sanitized object
 */
export const sanitizeObject = <T extends Record<string, any>>(
    obj: T,
    options?: Parameters<typeof sanitizeInput>[1]
): T => {
    if (!obj || typeof obj !== 'object') return obj;

    const sanitized: any = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            sanitized[key] = sanitizeInput(value, options);
        } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeObject(value, options);
        } else {
            sanitized[key] = value;
        }
    }

    return sanitized as T;
};
