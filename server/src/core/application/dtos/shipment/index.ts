import { z } from 'zod';

// Address Schema
export const AddressSchema = z.object({
    line1: z.string().min(1, 'Address line 1 is required'),
    line2: z.string().optional(),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    pincode: z.string().regex(/^[0-9]{6}$/, 'Pincode must be 6 digits'),
    country: z.string().default('India'),
    phone: z.string().regex(/^[0-9]{10}$/, 'Phone must be 10 digits').optional(),
});

// Package Schema
export const PackageSchema = z.object({
    weight: z.number().positive('Weight must be positive'),
    dimensions: z.object({
        length: z.number().positive('Length must be positive'),
        width: z.number().positive('Width must be positive'),
        height: z.number().positive('Height must be positive'),
    }),
    description: z.string().optional(),
    declaredValue: z.number().positive().optional(),
});

// Create Shipment DTO Schema
export const CreateShipmentDtoSchema = z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    carrierId: z.string().min(1, 'Carrier ID is required'),
    origin: AddressSchema,
    destination: AddressSchema,
    package: PackageSchema,
});

export type CreateShipmentDto = z.infer<typeof CreateShipmentDtoSchema>;

// Update Shipment Status DTO Schema
export const UpdateShipmentStatusDtoSchema = z.object({
    status: z.enum([
        'pending',
        'picked_up',
        'in_transit',
        'out_for_delivery',
        'delivered',
        'cancelled',
        'returned',
        'failed',
    ]),
    message: z.string().min(1, 'Message is required'),
    location: z.string().optional(),
});

export type UpdateShipmentStatusDto = z.infer<typeof UpdateShipmentStatusDtoSchema>;
