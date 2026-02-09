/**
 * Shared Zod validation schemas for use across multiple controllers
 * Centralizes common validation patterns to ensure consistency
 */

import { z } from 'zod';

// ============================================================================
// Address Schemas
// ============================================================================

export const addressSchema = z.object({
    line1: z.string().min(3, 'Address line 1 must be at least 3 characters'),
    line2: z.string().optional(),
    city: z.string().min(2, 'City must be at least 2 characters'),
    state: z.string().min(2, 'State must be at least 2 characters'),
    country: z.string().min(2).default('India'),
    postalCode: z.string().min(5).max(10, 'Invalid postal code'),
});

export type Address = z.infer<typeof addressSchema>;

// ============================================================================
// Customer/Contact Schemas
// ============================================================================

export const customerInfoSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email format').optional(),
    phone: z.string().min(10, 'Phone must be at least 10 digits'),
    address: addressSchema,
});

export type CustomerInfo = z.infer<typeof customerInfoSchema>;

export const contactInfoSchema = z.object({
    name: z.string().min(2),
    phone: z.string().min(10),
    email: z.string().email().optional(),
    alternatePhone: z.string().optional(),
});

export type ContactInfo = z.infer<typeof contactInfoSchema>;

// ============================================================================
// Product Schemas
// ============================================================================

export const productSchema = z.object({
    name: z.string().min(1, 'Product name is required'),
    sku: z.string().optional(),
    quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    price: z.number().min(0, 'Price cannot be negative'),
    weight: z.number().min(0).optional(),
    dimensions: z.object({
        length: z.number().min(0).optional(),
        width: z.number().min(0).optional(),
        height: z.number().min(0).optional(),
    }).optional(),
});

export type Product = z.infer<typeof productSchema>;

// ============================================================================
// Order Schemas
// ============================================================================

export const orderStatusSchema = z.enum([
    'pending',
    'ready_to_ship',
    'shipped',
    'delivered',
    'cancelled',
    'rto',
]);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const paymentStatusSchema = z.enum([
    'pending',
    'paid',
    'failed',
    'refunded',
]);

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const paymentMethodSchema = z.enum(['cod', 'prepaid']);

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const createOrderSchema = z.object({
    customerInfo: customerInfoSchema,
    products: z.array(productSchema).min(1, 'At least one product is required'),
    paymentMethod: paymentMethodSchema.optional(),
    warehouseId: z.string().optional(),
    notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional(),
    tags: z.array(z.string()).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const updateOrderSchema = z.object({
    customerInfo: customerInfoSchema.partial().optional(),
    products: z.array(productSchema).optional(),
    currentStatus: orderStatusSchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
    paymentMethod: paymentMethodSchema.optional(),
    notes: z.string().max(1000).optional(),
    tags: z.array(z.string()).optional(),
});

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

// ============================================================================
// Shipment Schemas
// ============================================================================

export const shipmentStatusSchema = z.enum([
    'created',
    'picked',
    'in_transit',
    'out_for_delivery',
    'delivered',
    'ndr',
    'rto',
    'cancelled',
]);

export type ShipmentStatus = z.infer<typeof shipmentStatusSchema>;

export const serviceTypeSchema = z.enum(['express', 'standard']);

export type ServiceType = z.infer<typeof serviceTypeSchema>;

export const createShipmentSchema = z.object({
    orderId: z.string().min(1, 'Order ID is required'),
    serviceType: serviceTypeSchema.default('standard'),
    carrierOverride: z.string().optional(),
    warehouseId: z.string().optional(),
    instructions: z.string().max(500, 'Instructions cannot exceed 500 characters').optional(),
});

export type CreateShipmentInput = z.infer<typeof createShipmentSchema>;

export const updateShipmentStatusSchema = z.object({
    status: shipmentStatusSchema,
    location: z.string().max(200).optional(),
    description: z.string().max(500).optional(),
});

export type UpdateShipmentStatusInput = z.infer<typeof updateShipmentStatusSchema>;

// ============================================================================
// RateCard Schemas
// ============================================================================

export const zonePricingEntrySchema = z.object({
    baseWeight: z.number().min(0),
    basePrice: z.number().min(0),
    additionalPricePerKg: z.number().min(0),
});

export const zonePricingSchema = z.object({
    zoneA: zonePricingEntrySchema,
    zoneB: zonePricingEntrySchema,
    zoneC: zonePricingEntrySchema,
    zoneD: zonePricingEntrySchema,
    zoneE: zonePricingEntrySchema,
});

export const rateCardStatusSchema = z.enum(['draft', 'active', 'inactive', 'expired']);

export const createRateCardSchema = z.object({
    name: z.string().min(2, 'Rate card name is required'),
    rateCardCategory: z.string().optional(),
    shipmentType: z.enum(['forward', 'reverse']).optional(),
    gst: z.number().min(0).optional(),
    minimumFare: z.number().min(0).optional(),
    minimumFareCalculatedOn: z.enum(['freight', 'freight_overhead']).optional(),
    zoneBType: z.enum(['state', 'distance']).optional(),
    codPercentage: z.number().min(0).optional(),
    codMinimumCharge: z.number().min(0).optional(),
    fuelSurcharge: z.number().min(0).optional(),
    fuelSurchargeBase: z.enum(['freight', 'freight_cod']).optional(),
    zonePricing: zonePricingSchema,
    effectiveDates: z.object({
        startDate: z.string().transform(str => new Date(str)),
        endDate: z.string().transform(str => new Date(str)).optional(),
    }),
    status: rateCardStatusSchema.default('draft'),
});

export type CreateRateCardInput = z.infer<typeof createRateCardSchema>;

export const updateRateCardSchema = createRateCardSchema.partial();

export const calculateRateSchema = z.object({
    weight: z.number().min(0, 'Weight must be positive'),
    zoneId: z.string().optional(),
    originPincode: z.string().optional(),
    destinationPincode: z.string().optional(),
    carrier: z.string().optional(),
    serviceType: serviceTypeSchema.default('standard'),
});


export type CalculateRateInput = z.infer<typeof calculateRateSchema>;

export const recommendCourierSchema = z.object({
    pickupPincode: z.string().min(6, 'Invalid pickup pincode'),
    deliveryPincode: z.string().min(6, 'Invalid delivery pincode'),
    weight: z.number().min(0.001, 'Weight must be greater than 0'),
    declaredValue: z.number().min(0).optional(),
    paymentMode: z.enum(['cod', 'prepaid']).default('prepaid'),
});

export type RecommendCourierInput = z.infer<typeof recommendCourierSchema>;

export const quoteCourierOptionsSchema = z.object({
    fromPincode: z.string().min(6, 'Invalid origin pincode'),
    toPincode: z.string().min(6, 'Invalid destination pincode'),
    weight: z.number().min(0.001, 'Weight must be greater than 0'),
    dimensions: z.object({
        length: z.number().min(0.1),
        width: z.number().min(0.1),
        height: z.number().min(0.1),
    }),
    paymentMode: z.enum(['cod', 'prepaid']).default('prepaid'),
    orderValue: z.number().min(0),
    shipmentType: z.enum(['forward', 'reverse']).default('forward'),
});

export type QuoteCourierOptionsInput = z.infer<typeof quoteCourierOptionsSchema>;

export const selectQuoteOptionSchema = z.object({
    optionId: z.string().min(1, 'Option ID is required'),
});

export type SelectQuoteOptionInput = z.infer<typeof selectQuoteOptionSchema>;

export const bookFromQuoteSchema = z.object({
    sessionId: z.string().min(1, 'Session ID is required'),
    optionId: z.string().min(1).optional(),
    orderId: z.string().min(1, 'Order ID is required'),
    warehouseId: z.string().optional(),
    instructions: z.string().max(500).optional(),
});

export type BookFromQuoteInput = z.infer<typeof bookFromQuoteSchema>;

const courierProviderSchema = z.enum(['velocity', 'delhivery', 'ekart']);

export const createCourierServiceSchema = z.object({
    provider: courierProviderSchema,
    integrationId: z.string().optional(),
    serviceCode: z.string().min(2).max(100),
    providerServiceId: z.string().max(100).optional(),
    displayName: z.string().min(2).max(120),
    serviceType: z.enum(['surface', 'express', 'air', 'standard']),
    status: z.enum(['active', 'inactive', 'hidden']).optional(),
    constraints: z.object({
        minWeightKg: z.number().min(0).optional(),
        maxWeightKg: z.number().min(0).optional(),
        maxCodValue: z.number().min(0).optional(),
        maxPrepaidValue: z.number().min(0).optional(),
        maxDimensions: z.object({
            length: z.number().min(0).optional(),
            width: z.number().min(0).optional(),
            height: z.number().min(0).optional(),
        }).optional(),
        paymentModes: z.array(z.enum(['cod', 'prepaid', 'pickup', 'repl'])).optional(),
    }).optional(),
    sla: z.object({
        eddMinDays: z.number().int().min(0).optional(),
        eddMaxDays: z.number().int().min(0).optional(),
    }).optional(),
    zoneSupport: z.array(z.string().min(1)).optional(),
    source: z.enum(['manual', 'synced']).optional(),
});

export type CreateCourierServiceInput = z.infer<typeof createCourierServiceSchema>;

export const updateCourierServiceSchema = createCourierServiceSchema.partial().refine(
    (value) => Object.keys(value).length > 0,
    { message: 'At least one field is required for update' }
);

export type UpdateCourierServiceInput = z.infer<typeof updateCourierServiceSchema>;

const serviceRateCardZoneRuleSchema = z.object({
    zoneKey: z.string().min(1),
    slabs: z.array(
        z.object({
            minKg: z.number().min(0),
            maxKg: z.number().min(0),
            charge: z.number().min(0),
        })
    ).min(1),
    additionalPerKg: z.number().min(0).optional(),
    codRule: z.object({
        type: z.enum(['percentage', 'flat', 'slab']),
        percentage: z.number().min(0).optional(),
        minCharge: z.number().min(0).optional(),
        maxCharge: z.number().min(0).optional(),
    }).optional(),
    fuelSurcharge: z.object({
        percentage: z.number().min(0).optional(),
        base: z.enum(['freight', 'freight_cod']).optional(),
    }).optional(),
    rtoRule: z.object({
        percentage: z.number().min(0).optional(),
        minCharge: z.number().min(0).optional(),
    }).optional(),
});

export const upsertServiceRateCardSchema = z.object({
    serviceId: z.string().min(1),
    cardType: z.enum(['cost', 'sell']),
    sourceMode: z.enum(['LIVE_API', 'TABLE', 'HYBRID']).optional(),
    currency: z.enum(['INR']).optional(),
    effectiveDates: z.object({
        startDate: z.union([z.string(), z.date()]),
        endDate: z.union([z.string(), z.date()]).optional(),
    }).optional(),
    status: z.enum(['draft', 'active', 'inactive']).optional(),
    calculation: z.object({
        weightBasis: z.enum(['actual', 'volumetric', 'max']).optional(),
        roundingUnitKg: z.number().min(0.1).optional(),
        roundingMode: z.enum(['ceil', 'floor', 'nearest']).optional(),
        dimDivisor: z.number().min(1).optional(),
    }).optional(),
    zoneRules: z.array(serviceRateCardZoneRuleSchema).min(1),
    metadata: z.object({
        version: z.number().int().min(1).optional(),
        importedFrom: z.string().max(100).optional(),
        importedAt: z.union([z.string(), z.date()]).optional(),
    }).optional(),
});

export type UpsertServiceRateCardInput = z.infer<typeof upsertServiceRateCardSchema>;

export const importServiceRateCardSchema = z.object({
    zoneRules: z.array(serviceRateCardZoneRuleSchema).min(1),
    metadata: z.object({
        importedFrom: z.string().max(100).optional(),
    }).optional(),
});

export type ImportServiceRateCardInput = z.infer<typeof importServiceRateCardSchema>;

export const simulateServiceRateCardSchema = z.object({
    weight: z.number().min(0.001),
    dimensions: z.object({
        length: z.number().min(0.1),
        width: z.number().min(0.1),
        height: z.number().min(0.1),
    }).optional(),
    zone: z.string().optional(),
    paymentMode: z.enum(['cod', 'prepaid']).optional(),
    orderValue: z.number().min(0).optional(),
    provider: courierProviderSchema.optional(),
    fromPincode: z.string().regex(/^[1-9][0-9]{5}$/).optional(),
    toPincode: z.string().regex(/^[1-9][0-9]{5}$/).optional(),
});

export type SimulateServiceRateCardInput = z.infer<typeof simulateServiceRateCardSchema>;

export const upsertSellerCourierPolicySchema = z.object({
    allowedProviders: z.array(courierProviderSchema).optional(),
    allowedServiceIds: z.array(z.string()).optional(),
    blockedProviders: z.array(courierProviderSchema).optional(),
    blockedServiceIds: z.array(z.string()).optional(),
    selectionMode: z.enum(['manual_with_recommendation', 'manual_only', 'auto']).optional(),
    autoPriority: z.enum(['price', 'speed', 'balanced']).optional(),
    balancedDeltaPercent: z.number().min(0).max(100).optional(),
    isActive: z.boolean().optional(),
    metadata: z.object({
        notes: z.string().max(1000).optional(),
    }).optional(),
});

export type UpsertSellerCourierPolicyInput = z.infer<typeof upsertSellerCourierPolicySchema>;

export const carrierBillingImportSchema = z.object({
    thresholdPercent: z.number().min(0).max(100).optional(),
    records: z.array(z.object({
        shipmentId: z.string().optional(),
        provider: z.enum(['velocity', 'delhivery', 'ekart']),
        awb: z.string().min(1),
        invoiceRef: z.string().optional(),
        remittanceRef: z.string().optional(),
        billedComponents: z.record(z.number()).optional(),
        billedTotal: z.number().min(0),
        source: z.enum(['api', 'webhook', 'mis', 'manual']).optional(),
        billedAt: z.union([z.string(), z.date()]).optional(),
        rawProviderPayload: z.any().optional(),
    })).default([]),
});

export type CarrierBillingImportInput = z.infer<typeof carrierBillingImportSchema>;

export const updatePricingVarianceCaseSchema = z.object({
    status: z.enum(['open', 'under_review', 'resolved', 'waived']),
    resolution: z.object({
        outcome: z.string().optional(),
        adjustedCost: z.number().optional(),
        refundAmount: z.number().optional(),
        notes: z.string().optional(),
    }).optional(),
});

export type UpdatePricingVarianceCaseInput = z.infer<typeof updatePricingVarianceCaseSchema>;

// ============================================================================
// Zone Schemas
// ============================================================================

export const transitTimeSchema = z.object({
    carrier: z.string().min(1),
    serviceType: z.string().min(1),
    minDays: z.number().int().min(0),
    maxDays: z.number().int().min(0),
});

export const createZoneSchema = z.object({
    name: z.string().min(2, 'Zone name is required'),
    postalCodes: z.array(z.string()).min(1, 'At least one postal code is required'),
    serviceability: z.object({
        carriers: z.array(z.string()).min(1, 'At least one carrier required'),
        serviceTypes: z.array(z.string()).min(1, 'At least one service type required'),
    }),
    transitTimes: z.array(transitTimeSchema).optional(),
});

export type CreateZoneInput = z.infer<typeof createZoneSchema>;

export const updateZoneSchema = createZoneSchema.partial();

export type UpdateZoneInput = z.infer<typeof updateZoneSchema>;

// ============================================================================
// Query Schemas (for filtering/searching)
// ============================================================================

export const paginationQuerySchema = z.object({
    page: z.string().optional().transform(val => parseInt(val || '1', 10)),
    limit: z.string().optional().transform(val => parseInt(val || '20', 10)),
});

export const dateRangeQuerySchema = z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
});

export const searchQuerySchema = z.object({
    search: z.string().optional(),
});

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate weight slabs don't overlap
 */
export const validateWeightSlabs = (
    rules: Array<{ minWeight: number; maxWeight: number }>
): boolean => {
    if (rules.length <= 1) return true;

    const sorted = [...rules].sort((a, b) => a.minWeight - b.minWeight);
    for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].minWeight < sorted[i - 1].maxWeight) {
            return false;
        }
    }
    return true;
};

/**
 * Valid order status transitions
 */
export const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
    pending: ['ready_to_ship', 'cancelled'],
    ready_to_ship: ['shipped', 'cancelled'],
    shipped: ['delivered', 'rto'],
    delivered: [],
    cancelled: [],
    rto: [],
};

/**
 * Valid shipment status transitions
 */
export const SHIPMENT_STATUS_TRANSITIONS: Record<string, string[]> = {
    created: ['picked', 'cancelled'],
    picked: ['in_transit', 'rto'],
    in_transit: ['out_for_delivery', 'rto', 'ndr'],
    out_for_delivery: ['delivered', 'ndr', 'rto'],
    delivered: [],
    ndr: ['out_for_delivery', 'rto'],
    rto: [],
    cancelled: [],
};

// ============================================================================
// KYC Validation Schemas
// ============================================================================

export const panSchema = z.object({
    number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/),
    image: z.string().url(),
});

export const aadhaarSchema = z.object({
    number: z.string().regex(/^\d{12}$/),
    frontImage: z.string().url(),
    backImage: z.string().url(),
});

export const gstinSchema = z.object({
    number: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/),
});

export const bankAccountSchema = z.object({
    accountNumber: z.string().min(5),
    ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/),
    accountHolderName: z.string().min(2),
    bankName: z.string().min(2),
    proofImage: z.string().url().optional(),
});

const ifscSchema = z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/);

export const submitKYCSchema = z.object({
    pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/).optional(),
    aadhaar: z.string().regex(/^\d{12}$/).optional(),
    gstin: z.string().regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).optional(),
    bankAccount: z.object({
        accountNumber: z.string().regex(/^\d{9,18}$/),
        ifsc: ifscSchema.optional(),
        ifscCode: ifscSchema.optional(),
        bankName: z.string().min(2).optional(),
    }).refine((data) => Boolean(data.ifsc || data.ifscCode), {
        message: 'IFSC code is required',
        path: ['ifsc'],
    }).optional(),
});

export const verifyDocumentSchema = z.object({
    documentType: z.enum(['pan', 'aadhaar', 'gstin', 'bankAccount']),
    verified: z.boolean(),
    notes: z.string().optional(),
});

export const invalidateDocumentSchema = z.object({
    documentType: z.enum(['pan', 'aadhaar', 'gstin', 'bankAccount']),
    reason: z.string().max(500).optional(),
});
