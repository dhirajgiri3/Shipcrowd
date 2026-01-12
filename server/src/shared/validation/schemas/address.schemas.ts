import { z } from 'zod';

/**
 * Address Validation Schemas
 */

// Regex for Indian Pincode: 6 digits, can't start with 0
const pincodeRegex = /^[1-9][0-9]{5}$/;

export const validatePincodeSchema = z.object({
    params: z.object({
        pincode: z.string().regex(pincodeRegex, 'Invalid pincode format'),
    }),
});

export const checkServiceabilitySchema = z.object({
    fromPincode: z.string().regex(pincodeRegex, 'Invalid fromPincode format'),
    toPincode: z.string().regex(pincodeRegex, 'Invalid toPincode format'),
    courierId: z.string().min(1, 'Courier ID is required'),
});

export const calculateDistanceSchema = z.object({
    fromPincode: z.string().regex(pincodeRegex, 'Invalid fromPincode format'),
    toPincode: z.string().regex(pincodeRegex, 'Invalid toPincode format'),
});
