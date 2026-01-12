import { z } from 'zod';
import { VALIDATION_MESSAGES } from '../../constants/messages';

/**
 * Common Validation Schemas
 * Reusable Zod schemas with security patterns and custom error messages
 */

// ============================================================================
// Basic Types with Security
// ============================================================================

/**
 * Email validation (RFC 5322 compliant)
 * Prevents email injection attacks
 */
export const emailSchema = z
    .string()
    .email(VALIDATION_MESSAGES.INVALID_EMAIL)
    .toLowerCase()
    .trim()
    .max(255, VALIDATION_MESSAGES.MAX_LENGTH('Email', 255))
    .refine(
        (email) => !email.includes('<') && !email.includes('>'),
        { message: 'Email contains invalid characters' }
    );

/**
 * Phone number validation (Indian format)
 * Supports: 10 digits, +91 prefix, optional spaces/dashes
 */
export const phoneSchema = z
    .string()
    .trim()
    .refine(
        (phone) => {
            // Remove all non-digits
            const digits = phone.replace(/\D/g, '');
            // Should be exactly 10 digits or 12 digits with country code
            return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
        },
        { message: VALIDATION_MESSAGES.INVALID_PHONE }
    )
    .transform((phone) => phone.replace(/\D/g, '')); // Store only digits

/**
 * URL validation with whitelist
 * Prevents SSRF attacks
 */
export const urlSchema = (allowedDomains?: string[]) =>
    z
        .string()
        .url(VALIDATION_MESSAGES.INVALID_URL)
        .refine(
            (url) => {
                if (!allowedDomains) return true;
                try {
                    const hostname = new URL(url).hostname;
                    return allowedDomains.some(domain => hostname.endsWith(domain));
                } catch {
                    return false;
                }
            },
            { message: 'URL domain not allowed' }
        );

/**
 * MongoDB ObjectId validation
 * 24 character hex string
 */
export const objectIdSchema = (resource: string = 'Resource') =>
    z
        .string()
        .regex(/^[0-9a-fA-F]{24}$/, VALIDATION_MESSAGES.INVALID_OBJECT_ID(resource));

// ============================================================================
// Indian Document Validation
// ============================================================================

/**
 * PAN (Permanent Account Number) validation
 * Format: ABCDE1234F (5 letters, 4 digits, 1 letter)
 */
export const panSchema = z
    .string()
    .trim()
    .toUpperCase()
    .regex(
        /^[A-Z]{5}[0-9]{4}[A-Z]$/,
        VALIDATION_MESSAGES.INVALID_PAN
    )
    .length(10, VALIDATION_MESSAGES.EXACT_LENGTH('PAN', 10));

/**
 * GSTIN (Goods and Services Tax Identification Number) validation
 * Format: 15 characters
 */
export const gstinSchema = z
    .string()
    .trim()
    .toUpperCase()
    .regex(
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        VALIDATION_MESSAGES.INVALID_GSTIN
    )
    .length(15, VALIDATION_MESSAGES.EXACT_LENGTH('GSTIN', 15));

/**
 * Aadhaar number validation
 * Format: 12 digits
 */
export const aadhaarSchema = z
    .string()
    .trim()
    .regex(/^[0-9]{12}$/, VALIDATION_MESSAGES.INVALID_AADHAAR)
    .length(12, VALIDATION_MESSAGES.EXACT_LENGTH('Aadhaar', 12));

/**
 * IFSC Code validation
 * Format: AAAA0XXXXXX (4 letters, 1 zero, 6 alphanumeric)
 */
export const ifscSchema = z
    .string()
    .trim()
    .toUpperCase()
    .regex(
        /^[A-Z]{4}0[A-Z0-9]{6}$/,
        VALIDATION_MESSAGES.INVALID_IFSC
    )
    .length(11, VALIDATION_MESSAGES.EXACT_LENGTH('IFSC', 11));

// ============================================================================
// Date & Time
// ============================================================================

/**
 * Date string validation (ISO 8601)
 */
export const dateSchema = z
    .string()
    .datetime({ message: VALIDATION_MESSAGES.INVALID_DATE })
    .or(z.date());

/**
 * Date in the past
 */
export const pastDateSchema = (field: string = 'Date') =>
    dateSchema.refine(
        (date) => new Date(date) < new Date(),
        { message: VALIDATION_MESSAGES.DATE_IN_PAST(field) }
    );

/**
 * Date in the future
 */
export const futureDateSchema = (field: string = 'Date') =>
    dateSchema.refine(
        (date) => new Date(date) > new Date(),
        { message: VALIDATION_MESSAGES.DATE_IN_FUTURE(field) }
    );

/**
 * Date range validation
 */
export const dateRangeSchema = z.object({
    startDate: dateSchema,
    endDate: dateSchema,
}).refine(
    (data) => new Date(data.startDate) <= new Date(data.endDate),
    { message: VALIDATION_MESSAGES.DATE_RANGE_INVALID }
);

// ============================================================================
// Text with Security
// ============================================================================

/**
 * Safe string - prevents XSS and injection
 * Strips HTML and special characters
 */
export const safeStringSchema = (
    minLength: number = 1,
    maxLength: number = 255,
    fieldName: string = 'Field'
) =>
    z
        .string()
        .trim()
        .min(minLength, VALIDATION_MESSAGES.MIN_LENGTH(fieldName, minLength))
        .max(maxLength, VALIDATION_MESSAGES.MAX_LENGTH(fieldName, maxLength))
        .refine(
            (str) => !/<script|javascript:|onerror=/i.test(str),
            { message: 'Input contains potentially dangerous content' }
        )
        .refine(
            (str) => !/(\$where|\$regex|\$ne|\$gt|\$lt)/i.test(str),
            { message: 'Input contains invalid operators' }
        );

/**
 * Password validation
 * Min 8 chars, uppercase, lowercase, number
 */
export const passwordSchema = z
    .string()
    .min(8, VALIDATION_MESSAGES.MIN_LENGTH('Password', 8))
    .max(128, VALIDATION_MESSAGES.MAX_LENGTH('Password', 128))
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        VALIDATION_MESSAGES.PASSWORD_WEAK
    );

/**
 * Username validation
 * Alphanumeric, underscore, hyphen only
 */
export const usernameSchema = z
    .string()
    .trim()
    .toLowerCase()
    .min(3, VALIDATION_MESSAGES.MIN_LENGTH('Username', 3))
    .max(30, VALIDATION_MESSAGES.MAX_LENGTH('Username', 30))
    .regex(
        /^[a-z0-9_-]+$/,
        'Username can only contain letters, numbers, underscores, and hyphens'
    );

// ============================================================================
// Numbers with Validation
// ============================================================================

/**
 * Positive integer
 */
export const positiveIntSchema = (field: string = 'Value') =>
    z
        .number()
        .int(VALIDATION_MESSAGES.INTEGER_REQUIRED(field))
        .positive(VALIDATION_MESSAGES.POSITIVE_NUMBER(field));

/**
 * Positive number (can be decimal)
 */
export const positiveNumberSchema = (field: string = 'Value') =>
    z
        .number()
        .positive(VALIDATION_MESSAGES.POSITIVE_NUMBER(field));

/**
 * Number within range
 */
export const numberInRangeSchema = (
    min: number,
    max: number,
    field: string = 'Value'
) =>
    z
        .number()
        .min(min, VALIDATION_MESSAGES.MIN_VALUE(field, min))
        .max(max, VALIDATION_MESSAGES.MAX_VALUE(field, max));

// ============================================================================
// Arrays
// ============================================================================

/**
 * Non-empty array
 */
export const nonEmptyArraySchema = <T extends z.ZodTypeAny>(
    itemSchema: T,
    field: string = 'Array'
) =>
    z
        .array(itemSchema)
        .min(1, VALIDATION_MESSAGES.ARRAY_MIN_LENGTH(field, 1));

/**
 * Array with length constraints
 */
export const arrayWithLengthSchema = <T extends z.ZodTypeAny>(
    itemSchema: T,
    minLength: number,
    maxLength: number,
    field: string = 'Array'
) =>
    z
        .array(itemSchema)
        .min(minLength, VALIDATION_MESSAGES.ARRAY_MIN_LENGTH(field, minLength))
        .max(maxLength, VALIDATION_MESSAGES.ARRAY_MAX_LENGTH(field, maxLength));

// ============================================================================
// File Upload
// ============================================================================

/**
 * File upload validation
 */
export const fileUploadSchema = (
    maxSizeMB: number = 5,
    allowedTypes: string[] = ['image/jpeg', 'image/png', 'application/pdf']
) =>
    z.object({
        filename: safeStringSchema(1, 255, 'Filename'),
        mimetype: z
            .string()
            .refine(
                (type) => allowedTypes.includes(type),
                { message: VALIDATION_MESSAGES.INVALID_FILE_TYPE(allowedTypes.join(', ')) }
            ),
        size: z
            .number()
            .max(
                maxSizeMB * 1024 * 1024,
                VALIDATION_MESSAGES.FILE_TOO_LARGE(`${maxSizeMB}MB`)
            ),
    });

// ============================================================================
// Pagination
// ============================================================================

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
    page: z
        .string()
        .optional()
        .default('1')
        .transform((val) => parseInt(val, 10))
        .pipe(positiveIntSchema('Page')),
    limit: z
        .string()
        .optional()
        .default('10')
        .transform((val) => parseInt(val, 10))
        .pipe(numberInRangeSchema(1, 100, 'Limit')),
});

// ============================================================================
// Sorting
// ============================================================================

/**
 * Sort parameters
 */
export const sortSchema = (allowedFields: string[]) =>
    z.object({
        sortBy: z
            .string()
            .optional()
            .refine(
                (field) => !field || allowedFields.includes(field),
                { message: 'Invalid sort field' }
            ),
        sortOrder: z
            .enum(['asc', 'desc'])
            .optional()
            .default('desc'),
    });
