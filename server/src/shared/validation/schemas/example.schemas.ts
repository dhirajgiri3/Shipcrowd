import { z } from 'zod';
import {
    emailSchema,
    phoneSchema,
    objectIdSchema,
    safeStringSchema,
    positiveIntSchema,
    positiveNumberSchema,
    nonEmptyArraySchema,
    paginationSchema,
    sortSchema,
} from './common.schemas';

/**
 * Example: Order Validation Schemas
 * Demonstrates how to compose validation schemas
 */

// Product item schema
const orderItemSchema = z.object({
    sku: safeStringSchema(1, 50, 'SKU'),
    name: safeStringSchema(1, 200, 'Product Name'),
    quantity: positiveIntSchema('Quantity'),
    price: positiveNumberSchema('Price'),
    weight: positiveNumberSchema('Weight').optional(),
    dimensions: z.object({
        length: positiveNumberSchema('Length'),
        width: positiveNumberSchema('Width'),
        height: positiveNumberSchema('Height'),
    }).optional(),
});

// Customer info schema
const customerInfoSchema = z.object({
    name: safeStringSchema(1, 100, 'Customer Name'),
    email: emailSchema,
    phone: phoneSchema,
    address: z.object({
        line1: safeStringSchema(1, 200, 'Address Line 1'),
        line2: safeStringSchema(0, 200, 'Address Line 2').optional(),
        city: safeStringSchema(1, 100, 'City'),
        state: safeStringSchema(1, 100, 'State'),
        pincode: z.string().regex(/^[0-9]{6}$/, 'Invalid pincode'),
        country: safeStringSchema(1, 50, 'Country').default('India'),
    }),
});

// Create order schema
export const createOrderSchema = z.object({
    orderNumber: safeStringSchema(1, 50, 'Order Number').optional(),
    customerInfo: customerInfoSchema,
    items: nonEmptyArraySchema(orderItemSchema, 'Order Items'),
    paymentMethod: z.enum(['cod', 'prepaid', 'credit']),
    notes: safeStringSchema(0, 500, 'Notes').optional(),
    tags: z.array(safeStringSchema(1, 50, 'Tag')).optional(),
});

// Update order schema (all fields optional)
export const updateOrderSchema = createOrderSchema.partial();

// Get orders query schema
export const getOrdersQuerySchema = paginationSchema.merge(
    sortSchema(['createdAt', 'orderNumber', 'status'])
).merge(
    z.object({
        status: z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).optional(),
        search: safeStringSchema(0, 100, 'Search').optional(),
    })
);

// Order ID param schema
export const orderIdParamSchema = z.object({
    id: objectIdSchema('Order'),
});

/**
 * Example: User Validation Schemas
 */

// Register user schema
export const registerUserSchema = z.object({
    email: emailSchema,
    password: z.string().min(8, 'Password must be at least 8 characters'),
    name: safeStringSchema(1, 100, 'Name'),
    phone: phoneSchema.optional(),
    acceptTerms: z.boolean().refine((val) => val === true, {
        message: 'You must accept the terms and conditions',
    }),
});

// Login schema
export const loginSchema = z.object({
    email: emailSchema,
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional(),
});

// Update profile schema
export const updateProfileSchema = z.object({
    name: safeStringSchema(1, 100, 'Name').optional(),
    phone: phoneSchema.optional(),
    avatar: z.string().url().optional(),
}).refine(
    (data) => Object.keys(data).length > 0,
    { message: 'At least one field must be provided' }
);

// Change password schema
export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string(),
}).refine(
    (data) => data.newPassword === data.confirmPassword,
    {
        message: 'Passwords do not match',
        path: ['confirmPassword'],
    }
);
