import mongoose from 'mongoose';
import { z } from 'zod';

/**
 * Common Zod validation schemas
 * Reusable schemas for consistent validation across the application
 */

/**
 * MongoDB ObjectId validation
 */
export const objectIdSchema = z.string().refine(
    (val) => mongoose.Types.ObjectId.isValid(val),
    { message: 'Invalid ObjectId format' }
);

/**
 * Email validation with proper format
 */
export const emailSchema = z
    .string()
    .email('Invalid email format')
    .toLowerCase()
    .trim();

/**
 * Indian phone number validation (10 digits)
 */
export const phoneSchema = z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Invalid Indian phone number format')
    .trim();

/**
 * Password validation (minimum 8 characters, at least one uppercase, one lowercase, one number)
 */
export const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number');

/**
 * Indian PIN code validation (6 digits)
 */
export const pinCodeSchema = z
    .string()
    .regex(/^\d{6}$/, 'Invalid PIN code format')
    .trim();

/**
 * PAN card validation (Indian tax number)
 * Format: ABCDE1234F
 */
export const panSchema = z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format')
    .toUpperCase()
    .trim();

/**
 * GST number validation (Indian tax registration)
 * Format: 22AAAAA0000A1Z5
 */
export const gstSchema = z
    .string()
    .regex(
        /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
        'Invalid GST number format'
    )
    .toUpperCase()
    .trim();

/**
 * URL validation
 */
export const urlSchema = z.string().url('Invalid URL format').trim();

/**
 * Positive integer validation
 */
export const positiveIntSchema = z.number().int().positive();

/**
 * Non-negative integer validation (includes 0)
 */
export const nonNegativeIntSchema = z.number().int().min(0);

/**
 * Positive decimal validation
 */
export const positiveDecimalSchema = z.number().positive();

/**
 * Non-negative decimal validation (includes 0)
 */
export const nonNegativeDecimalSchema = z.number().min(0);

/**
 * Date string validation (ISO format)
 */
export const dateStringSchema = z.string().datetime();

/**
 * Pagination query parameters schema
 */
export const paginationSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(10),
});

/**
 * Search query parameters schema
 */
export const searchSchema = z.object({
    search: z.string().min(1).max(100).optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Combined pagination and search schema
 */
export const paginatedSearchSchema = paginationSchema.merge(searchSchema);

/**
 * Address validation schema
 */
export const addressSchema = z.object({
    line1: z.string().min(5).max(200),
    line2: z.string().max(200).optional(),
    city: z.string().min(2).max(100),
    state: z.string().min(2).max(100),
    country: z.string().default('India'),
    postalCode: pinCodeSchema,
});

/**
 * File upload validation schema
 */
export const fileUploadSchema = z.object({
    filename: z.string(),
    mimetype: z.string(),
    size: z.number().max(5 * 1024 * 1024, 'File size must be less than 5MB'),
    path: z.string(),
});

/**
 * Coordinate validation schema (latitude, longitude)
 */
export const coordinatesSchema = z.object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
});

/**
 * Helper function to validate ObjectId
 */
export const isValidObjectId = (id: string): boolean => {
    return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Helper function to convert string to ObjectId
 */
export const toObjectId = (id: string): mongoose.Types.ObjectId => {
    return new mongoose.Types.ObjectId(id);
};
