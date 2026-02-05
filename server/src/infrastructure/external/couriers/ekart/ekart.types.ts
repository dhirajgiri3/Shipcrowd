/**
 * Ekart API Types & Interfaces
 * API Version: 3.8.8
 * Base URL: https://app.elite.ekartlogistics.in
 * 
 * Documentation: @see docs/Resources/API/Courier/Ekart/Ekart_API.md
 * 
 * This file contains all type definitions for the Ekart courier integration,
 * including authentication, shipment creation, tracking, rates, and webhooks.
 */

// ==================== Error Types ====================

/**
 * Custom error class for Ekart API errors
 * Includes retry logic classification
 */
export class EkartError extends Error {
    constructor(
        public statusCode: number,
        public response: {
            message: string;
            error?: any;
            status_code: number;
            retryAfter?: number;  // For 429 rate limit errors
        },
        public isRetryable: boolean
    ) {
        super(response.message);
        this.name = 'EkartError';
        Object.setPrototypeOf(this, EkartError.prototype);
    }
}

/**
 * Standard Ekart API error response format
 */
export interface EkartErrorResponse {
    statusCode: number;
    code: string;
    message: string;
    description: string;
    severity: string;
}

// ==================== Authentication Types ====================

/**
 * Request payload for Ekart authentication
 */
export interface EkartAuthRequest {
    username: string;
    password: string;
}

/**
 * Response from Ekart authentication endpoint
 * Token is valid for 24 hours (86400 seconds)
 */
export interface EkartAuthResponse {
    access_token: string;
    scope: string;
    expires_in: number;  // seconds, typically 86400 (24 hours)
    token_type: 'Bearer';
}

// ==================== Location Types ====================

/**
 * Location details for pickup, drop, or return addresses
 * 
 * CRITICAL VALIDATIONS:
 * - phone: Must be 10 digits, range [1000000000..9999999999]
 * - pin: Must be exactly 6 digits
 */
export interface EkartLocation {
    location_type: 'Office' | 'Home';
    address: string;
    city: string;
    state: string;
    country: string;
    name: string;
    phone: number;  // 10 digits only
    pin: number;    // 6 digits
}

/**
 * Geo coordinates for address (optional)
 */
export interface EkartGeoLocation {
    lat: number;
    lon: number;
}

/**
 * Address registration request
 * Used for warehouse/pickup location registration
 */
export interface EkartAddressRequest {
    alias: string;
    phone: number;  // [1000000000..9999999999]
    address_line1: string;
    address_line2?: string;
    pincode: number;
    city?: string;
    state?: string;
    country?: string;  // "India" or "IN"
    geo?: EkartGeoLocation;
}

/**
 * Address registration response
 */
export interface EkartAddressResponse {
    status: boolean;
    alias: string;
    remark: string;
}

// ==================== Quality Check Types ====================

/**
 * Quality check details for reverse shipments
 * Used when qc_shipment is true
 */
export interface EkartQCDetails {
    qc_shipment: boolean;
    product_name: string;
    product_desc?: string;
    product_sku?: string;
    product_color?: string;
    product_size?: string;
    brand_name?: string;
    product_category?: string;
    ean_barcode?: string;
    serial_number?: string;
    imei_number?: string;
    product_images?: string[];
}

// ==================== Package & Item Types ====================

/**
 * Package details for multi-package shipments (MPS)
 */
export interface EkartPackage {
    weight: number;  // grams
    length: number;  // cm
    width: number;   // cm
    height: number;  // cm
}

/**
 * Item details for multi-package shipments
 */
export interface EkartItem {
    name: string;
    quantity: number;
    price: number;
    sku?: string;
}

// ==================== Shipment Request Types ====================

/**
 * Complete shipment creation request
 * 
 * PAYMENT MODES:
 * - "COD": Cash on Delivery (forward shipment)
 * - "Prepaid": Already paid (forward shipment)
 * - "Pickup": Reverse shipment (customer to seller)
 * 
 * SHIPMENT TYPES:
 * - Forward: payment_mode = "COD" or "Prepaid"
 * - Reverse: payment_mode = "Pickup", return_reason required
 */
export interface EkartShipmentRequest {
    // Seller Information
    seller_name: string;
    seller_address: string;
    seller_gst_tin: string;
    seller_gst_amount?: number;

    // Consignee Information
    consignee_name: string;
    consignee_alternate_phone: string;  // >= 10 characters
    consignee_gst_tin?: string;
    consignee_gst_amount: number;

    // Order Details
    order_number: string;
    invoice_number: string;
    invoice_date: string;
    document_number?: string;
    document_date?: string;

    // Product Details
    products_desc: string;
    category_of_goods: string;
    hsn_code?: string;
    quantity: number;  // >= 1

    // Financial Details
    payment_mode: 'COD' | 'Prepaid' | 'Pickup';
    total_amount: number;  // >= 1
    tax_value: number;     // >= 0
    taxable_amount: number; // >= 1
    commodity_value: string; // Same as taxable_amount in string format
    cod_amount: number;    // [0..49999]
    integrated_gst_amount?: number;

    // Package Dimensions
    weight: number;   // grams, >= 1
    length: number;   // cm, >= 1
    height: number;   // cm, >= 1
    width: number;    // cm, >= 1
    templateName?: string;  // Alternative to dimensions

    // Locations
    drop_location: EkartLocation;
    pickup_location: EkartLocation;
    return_location: EkartLocation;

    // Optional Features
    ewbn?: string;  // E-Way Bill Number (12 digits)
    return_reason?: string;  // Required for reverse shipments
    preferred_dispatch_date?: string;  // YYYY-MM-DD
    delayed_dispatch?: boolean;
    what3words_address?: string;

    // Special Shipment Types
    obd_shipment?: boolean;  // Open Box Delivery
    mps?: boolean;  // Multi-package shipment
    items?: EkartItem[];  // Required if mps = true
    packages?: EkartPackage[];  // Required if mps = true
    qc_details?: EkartQCDetails;  // For reverse shipments with QC
}

/**
 * Shipment creation response
 */
export interface EkartShipmentResponse {
    status: boolean;
    remark: string;
    tracking_id: string;  // Ekart tracking ID (AWB)
    vendor: string;       // Vendor partner chosen
    barcodes: {
        wbn: string;        // Vendor waybill
        order: string;      // Order number
        cod?: string;       // COD waybill (if applicable)
    };
}

// ==================== Tracking Types ====================

/**
 * NDR (Non-Delivery Report) status
 */
export type EkartNDRStatus =
    | 'Unknown Exception'
    | 'Customer Unavailable'
    | 'Address Issue'
    | 'Customer Refused'
    | 'Rescheduled'
    | 'Other';

/**
 * NDR action options
 */
export type EkartNDRAction =
    | 'REATTEMPT'
    | 'RTO'
    | 'UPDATE_ADDRESS'
    | 'CONTACT_CUSTOMER';

/**
 * Tracking event detail
 */
export interface EkartTrackingDetail {
    status: string;
    timestamp: number;
    location?: string;
    description?: string;
}

/**
 * Current tracking status
 */
export interface EkartTrackStatus {
    status: string;
    ctime: number;  // Creation timestamp
    pickupTime?: number;
    desc: string;
    location?: string;
    ndrStatus?: EkartNDRStatus;
    attempts?: number;
    ndrActions?: EkartNDRAction[];
    details: EkartTrackingDetail[];
}

/**
 * Tracking response
 */
export interface EkartTrackingResponse {
    _id: string;
    track: EkartTrackStatus;
    edd?: number;  // Estimated delivery date (timestamp)
    order_number: string;
}

/**
 * Raw Ekart tracking response (from /data/v1/elite/track/{wbn})
 */
export interface EkartRawTrackingResponse {
    [wbn: string]: {
        shipment_type: string;
        cod_amount: string;
        shipment_id: string;
        shipment_value: string;
        order_id: string;
        external_tracking_id: string;
        delivery_type: string;
        weight: string;
        delivered: boolean;
        merchant_name: string;
        history: any[];
        receiver: any;
        current_hub: any;
        assigned_hub: any;
        sender: any;
        customer: any;
        items: any[];
        vendor: string;
        mh_inscanned: boolean;
        rto_detail: any;
        slotted_delivery: boolean;
        expected_delivery_slot: any;
        expected_delivery_date: string;
        rto: boolean;
        shipment_notes: any[];
        shipment_tickets: any;
    };
}

// ==================== Rate Estimation Types ====================

/**
 * Rate estimation request
 */
export interface EkartRateRequest {
    pickupPincode: number;
    dropPincode: number;
    invoiceAmount?: number;
    weight: number;  // grams
    length: number;  // cm
    height: number;  // cm
    width: number;   // cm
    serviceType: 'SURFACE' | 'EXPRESS';
    codAmount?: number;
    packages?: EkartPackage[];
}

/**
 * Rate estimation response
 */
export interface EkartRateResponse {
    type: 'WEIGHT_BASED' | 'SLAB_BASED';
    zone: string;
    volumetricWeight: string;
    billingWeight: string;
    shippingCharge: string;
    rtoCharge: string;
    fuelSurcharge: string;
    codCharge: string;
    qcCharge: string;
    taxes: string;
    total: string;
    rid: string;
    rSnapshotId: string;
}

// ==================== Serviceability Types ====================

/**
 * Serviceability check response
 */
export interface EkartServiceabilityResponse {
    serviceable: boolean;
    pincode: number;
    city?: string;
    state?: string;
    zone?: string;
    estimatedDays?: number;
}

// ==================== Manifest Types ====================

/**
 * Manifest generation request
 * Maximum 100 AWBs at a time
 */
export interface EkartManifestRequest {
    ids: string[];  // [1..100] unique tracking IDs
}

/**
 * Manifest generation response
 */
export interface EkartManifestResponse {
    ctime: number;
    manifestNumber: number;
    manifestDownloadUrl: string;
}

// ==================== Label Types ====================

/**
 * Label download request
 * Maximum 100 AWBs at a time
 */
export interface EkartLabelRequest {
    ids: string[];  // [1..100] unique tracking IDs
}

/**
 * Label download response (when json_only=true)
 */
export interface EkartLabelResponse {
    labels: Array<{
        tracking_id: string;
        label_url: string;
    }>;
}

// ==================== NDR Action Types ====================

/**
 * NDR action request
 */
export interface EkartNDRActionRequest {
    tracking_id: string;
    action: EkartNDRAction;
    preferred_date?: string;  // YYYY-MM-DD
    new_address?: Partial<EkartLocation>;
    instructions?: string;
}

/**
 * NDR action response
 */
export interface EkartNDRActionResponse {
    success: boolean;
    message: string;
    uplId?: string;  // Update ID
}

// ==================== Webhook Types ====================

/**
 * Webhook event types
 */
export type EkartWebhookEvent = 'track_updated' | 'shipment_created';

/**
 * Webhook payload for track_updated event
 */
export interface EkartTrackUpdatedWebhook {
    event: 'track_updated';
    tracking_id: string;
    status: string;
    timestamp: number;
    location?: string;
    ndrStatus?: EkartNDRStatus;
    ndrActions?: EkartNDRAction[];
}

/**
 * Webhook payload for shipment_created event
 */
export interface EkartShipmentCreatedWebhook {
    event: 'shipment_created';
    tracking_id: string;
    order_number: string;
    vendor: string;
    timestamp: number;
}

/**
 * Union type for all webhook payloads
 */
export type EkartWebhookPayload =
    | EkartTrackUpdatedWebhook
    | EkartShipmentCreatedWebhook;

// ==================== Status Mappings ====================

/**
 * Ekart status to internal status mapping
 * Used by StatusMapperService
 */
export const EKART_STATUS_MAP: Record<string, string> = {
    'Order Placed': 'manifested',
    'Picked Up': 'picked_up',
    'In Transit': 'in_transit',
    'Out for Delivery': 'out_for_delivery',
    'Delivered': 'delivered',
    'Cancelled': 'cancelled',
    'RTO Initiated': 'rto_initiated',
    'RTO Delivered': 'rto_delivered',
    'Delivery Failed': 'ndr',
    'Lost': 'lost',
    'Damaged': 'damaged',
};

/**
 * Statuses from which shipment can be cancelled
 */
export const CANCELLABLE_EKART_STATUSES = [
    'Order Placed',
    'Picked Up',
    'In Transit',
];

/**
 * Statuses eligible for reattempt
 */
export const REATTEMPT_ELIGIBLE_STATUSES = [
    'Delivery Failed',
    'Out for Delivery',
];

/**
 * Terminal statuses (no further updates expected)
 */
export const TERMINAL_EKART_STATUSES = [
    'Delivered',
    'RTO Delivered',
    'Lost',
    'Damaged',
    'Cancelled',
];

// ==================== Constants ====================

/**
 * Ekart API endpoints
 */
export const EKART_ENDPOINTS = {
    AUTH: '/integrations/v2/auth/token',
    CREATE_SHIPMENT: '/api/v1/package/create',
    CANCEL_SHIPMENT: '/api/v1/package/cancel',
    TRACK: '/api/v1/track',
    RAW_TRACK: '/data/v1/elite/track',
    RATE_ESTIMATE: '/data/pricing/estimate',
    MANIFEST: '/data/v2/generate/manifest',
    LABEL: '/api/v1/package/label',
    ADDRESS: '/api/v2/address',
    ADDRESSES: '/api/v2/addresses',
    DISPATCH_DATE: '/data/shipment/dispatch-date',
    SERVICEABILITY: '/api/v2/serviceability',
} as const;

/**
 * Ekart API rate limits (requests per second)
 * Conservative estimates - tune based on actual limits
 */
export const EKART_RATE_LIMITS = {
    CREATE_SHIPMENT: 2,      // 2 req/sec
    TRACK: 10,               // 10 req/sec
    RATE_ESTIMATE: 5,        // 5 req/sec
    SERVICEABILITY: 10,      // 10 req/sec
    CANCEL_SHIPMENT: 5,      // 5 req/sec
    MANIFEST: 2,             // 2 req/sec
    LABEL: 5,                // 5 req/sec
} as const;

/**
 * Ekart constraints
 */
export const EKART_CONSTRAINTS = {
    MAX_COD_AMOUNT: 49999,
    MAX_MANIFEST_AWBS: 100,
    MAX_LABEL_AWBS: 100,
    TOKEN_VALIDITY_SECONDS: 86400,  // 24 hours
    TOKEN_REFRESH_BUFFER_SECONDS: 60,  // Refresh 60s before expiry
    PHONE_MIN: 1000000000,
    PHONE_MAX: 9999999999,
    PINCODE_LENGTH: 6,
    EWBN_LENGTH: 12,
} as const;
