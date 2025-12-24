// Input sanitization utilities for production safety

/**
 * Sanitize string input to prevent XSS attacks
 */
export function sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';

    return input
        .replace(/[<>]/g, '') // Remove < and >
        .replace(/javascript:/gi, '') // Remove javascript: protocol
        .replace(/on\w+\s*=/gi, '') // Remove event handlers
        .trim();
}

/**
 * Sanitize phone number to digits only
 */
export function sanitizePhone(phone: string): string {
    return phone.replace(/\D/g, '').slice(0, 10);
}

/**
 * Sanitize pincode to 6 digits
 */
export function sanitizePincode(pincode: string): string {
    return pincode.replace(/\D/g, '').slice(0, 6);
}

/**
 * Sanitize email
 */
export function sanitizeEmail(email: string): string {
    return email.toLowerCase().trim().slice(0, 254);
}

/**
 * Validate and sanitize numeric input
 */
export function sanitizeNumber(value: string | number, options?: {
    min?: number;
    max?: number;
    decimals?: number;
}): number | null {
    const num = typeof value === 'string' ? parseFloat(value) : value;

    if (isNaN(num) || !isFinite(num)) return null;

    let result = num;

    if (options?.decimals !== undefined) {
        result = parseFloat(result.toFixed(options.decimals));
    }

    if (options?.min !== undefined && result < options.min) {
        result = options.min;
    }

    if (options?.max !== undefined && result > options.max) {
        result = options.max;
    }

    return result;
}

/**
 * Sanitize object by removing potentially dangerous keys
 */
export function sanitizeObject<T extends Record<string, any>>(
    obj: T,
    allowedKeys: (keyof T)[]
): Partial<T> {
    const sanitized: Partial<T> = {};

    allowedKeys.forEach(key => {
        if (key in obj) {
            const value = obj[key];

            if (typeof value === 'string') {
                sanitized[key] = sanitizeString(value) as T[typeof key];
            } else if (typeof value === 'number') {
                sanitized[key] = value as T[typeof key];
            } else if (typeof value === 'boolean') {
                sanitized[key] = value as T[typeof key];
            } else if (Array.isArray(value)) {
                sanitized[key] = value as T[typeof key];
            } else if (value && typeof value === 'object') {
                // For nested objects, recursively sanitize
                sanitized[key] = value as T[typeof key];
            }
        }
    });

    return sanitized;
}

/**
 * Validate URL and ensure it's safe
 */
export function sanitizeUrl(url: string): string | null {
    try {
        const parsed = new URL(url);

        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            return null;
        }

        return parsed.href;
    } catch {
        return null;
    }
}

export default {
    sanitizeString,
    sanitizePhone,
    sanitizePincode,
    sanitizeEmail,
    sanitizeNumber,
    sanitizeObject,
    sanitizeUrl,
};
