/**
 * Velocity Shipfast API - TypeScript Type Definitions
 *
 * Complete type definitions for Velocity Shipfast Courier API
 * Base URL: https://shazam.velocity.in
 * API Version: v1
 *
 * @see docs/Development/Backend/Integrations/VELOCITY_SHIPFAST_INTEGRATION.md
 */

// ==================== AUTHENTICATION ====================

export interface VelocityAuthRequest {
  username: string;
  password: string;
}

export interface VelocityAuthResponse {
  token: string;
  expires_at: string;
}

// ==================== FORWARD ORDER ====================

export interface VelocityOrderItem {
  name: string;
  sku?: string;
  units: number;
  selling_price: number;
  discount?: number;
  tax?: number;
}

export interface VelocityVendorDetails {
  email: string;
  phone: string;
  name: string;
  address: string;
  address_2?: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  pickup_location: string;
}

export interface VelocityForwardOrderRequest {
  order_id: string;
  order_date: string;                     // "YYYY-MM-DD HH:mm"
  channel_id?: string;
  billing_customer_name: string;
  billing_last_name?: string;
  billing_address: string;
  billing_city: string;
  billing_pincode: string;
  billing_state: string;
  billing_country: string;
  billing_email?: string;
  billing_phone: string;
  shipping_is_billing: boolean;
  print_label: boolean;
  order_items: VelocityOrderItem[];
  payment_method: 'COD' | 'Prepaid';      // COD is uppercase, Prepaid is title case per API
  sub_total: number;
  length: number;                         // cm
  breadth: number;                        // cm
  height: number;                         // cm
  weight: number;                         // kg
  cod_collectible?: number;               // Required for COD
  pickup_location: string;
  warehouse_id: string;
  vendor_details?: VelocityVendorDetails;
  idempotency_key?: string;               // Optional idempotency key
  carrier_id?: string;                    // Optional carrier selection
}

export interface VelocityShipmentResponse {
  shipment_id: string;
  order_id: string;
  awb_code: string;
  courier_name: string;
  courier_company_id: string;
  label_url: string;
  manifest_url?: string;
  status: string;
  frwd_charges?: {
    shipping_charges: string;
    cod_charges: string;
  };
  rto_charges?: {
    rto_charges: string;
  };
  applied_weight?: string;
  zone?: string;
  order_created: boolean;
  awb_generated: boolean;
  label_generated: boolean;
  pickup_generated: boolean;
  cod: boolean;
}

// ==================== TRACKING ====================

export interface VelocityTrackingRequest {
  awbs: string[];
}

export interface VelocityTrackingEvent {
  status: string;
  location: string;
  timestamp: string;
  description: string;
}

export interface VelocityTrackingResponse {
  awb: string;
  order_id: string;
  status: string;
  status_code: string;
  courier_name: string;
  current_location: string;
  estimated_delivery: string;
  tracking_history: VelocityTrackingEvent[];
  tracking_url?: string;
  delivered_date?: string;
  applied_weight?: number;
  charges_breakdown?: {
    freight_charge?: number;
    cod_charge?: number;
    total_charge?: number;
  };
}

// ==================== SERVICEABILITY ====================

export interface VelocityServiceabilityRequest {
  from: string;
  to: string;
  payment_mode: 'cod' | 'prepaid' | 'COD' | 'Prepaid';
  shipment_type: 'forward' | 'return';
}

export interface VelocityCarrierOption {
  courier_name: string;
  courier_company_id: string;
  estimated_delivery_days: number;
  rate: number;
  cod_available: boolean;
}

export interface VelocityServiceabilityResponse {
  delivery_pincode: string;
  is_serviceable: boolean;
  available_carriers: VelocityCarrierOption[];
  message?: string;
}

// ==================== CANCELLATION ====================

export interface VelocityCancelRequest {
  awbs: string[];                         // Changed from single awb string to array
}

export interface VelocityCancelResponse {
  message: string;
  awb: string;
  status: string;
}

// ==================== WAREHOUSE ====================

export interface VelocityWarehouseRequest {
  name: string;
  contact_person: string;                 // Required
  phone_number: string;                   // Was 'phone'
  email: string;
  address_attributes: {
    street_address: string;
    city: string;
    state: string;
    country: string;
    zip: string;
  };
}

export interface VelocityWarehouseResponse {
  warehouse_id: string;
  name: string;
  status: 'active' | 'inactive';
  message: string;
}

// ==================== ERROR HANDLING ====================

export interface VelocityAPIError {
  message: string;
  errors?: Record<string, string>;
  error?: string;
  status_code?: number;
}

export class VelocityError extends Error {
  statusCode: number;
  velocityError: VelocityAPIError;
  isRetryable: boolean;
  errorType: VelocityErrorType;

  constructor(
    statusCode: number,
    velocityError: VelocityAPIError,
    isRetryable: boolean = false,
    errorType: VelocityErrorType = VelocityErrorType.API_ERROR
  ) {
    super(velocityError.message);
    this.name = 'VelocityError';
    this.statusCode = statusCode;
    this.velocityError = velocityError;
    this.isRetryable = isRetryable;
    this.errorType = errorType;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, VelocityError);
    }
  }
}

// ==================== ERROR TYPES ====================

export enum VelocityErrorType {
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_SERVICEABLE = 'NOT_SERVICEABLE',
  WAYBILL_FAILED = 'WAYBILL_FAILED',
  ORDER_CREATION_FAILED = 'ORDER_CREATION_FAILED',
  COURIER_ASSIGNMENT_FAILED = 'COURIER_ASSIGNMENT_FAILED',
  WAREHOUSE_NOT_FOUND = 'WAREHOUSE_NOT_FOUND',
  SHIPMENT_NOT_FOUND = 'SHIPMENT_NOT_FOUND',
  CANNOT_CANCEL = 'CANNOT_CANCEL',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR'
}

// ==================== STATUS MAPPINGS ====================

export const VELOCITY_STATUS_MAP: Record<string, string> = {
  'NEW': 'created',
  'PKP': 'picked_up',
  'IT': 'in_transit',
  'OFD': 'out_for_delivery',
  'DEL': 'delivered',
  'NDR': 'ndr',
  'RTO': 'rto',
  'LOST': 'lost',
  'DAMAGED': 'damaged',
  'CANCELLED': 'cancelled'
};

export const CANCELLABLE_STATUSES = ['NEW', 'PKP', 'IT'];
export const NON_CANCELLABLE_STATUSES = ['OFD', 'DEL', 'RTO', 'LOST'];

// ==================== CONFIGURATION ====================

export interface VelocityConfig {
  baseUrl: string;
  username: string;
  password: string;
  testWarehouseId?: string;
  useMock?: boolean;
  timeout?: number;
}

// ==================== REVERSE PICKUP / RTO ====================

export interface VelocityReverseShipmentRequest {
  order_id: string;
  order_date: string;                     // "YYYY-MM-DD"
  channel_id?: string;

  // Pickup Details (Customer)
  pickup_customer_name: string;
  pickup_last_name: string;
  company_name?: string;
  pickup_address: string;
  pickup_address_2?: string;
  pickup_city: string;
  pickup_state: string;
  pickup_country: string;
  pickup_pincode: string;
  pickup_email?: string;
  pickup_phone: string;
  pickup_isd_code?: string;

  // Shipping Details (Warehouse/Destination)
  shipping_customer_name: string;
  shipping_last_name: string;
  shipping_address: string;
  shipping_address_2?: string;
  shipping_city: string;
  shipping_state: string;
  shipping_country: string;
  shipping_pincode: number | string;
  shipping_email?: string;
  shipping_phone: string;
  shipping_isd_code?: string;

  warehouse_id: string;                   // Return warehouse ID

  order_items: any[];                     // Array of items
  payment_method: 'Prepaid' | 'COD';      // Usually Prepaid
  total_discount?: string | number;
  sub_total: number;

  length: number;                         // cm
  breadth: number;                        // cm
  height: number;                         // cm
  weight: number;                         // kg
  request_pickup: boolean;
}

export interface VelocityReverseShipmentResponse {
  shipment_id: string;
  order_id: string;
  awb_code: string;                       // API returns awb_code
  original_awb?: string;                  // Not returned by API, we might attach it manually if needed
  courier_name: string;
  courier_company_id: string;
  label_url?: string;                     // Matches forward shipment
  manifest_url?: string;
  status?: string;                        // Might be missing in direct payload
  pickup_scheduled_date?: string | null;
  pickup_generated?: number;
  awb_generated?: number;
  order_created?: number;
  is_return?: number;
  charges?: {
    reverse_charges?: string;
    qc?: string;
    platform_fee?: number;
  };
}

export interface VelocitySchedulePickupRequest {
  awb: string;
  pickup_date: string;                    // "YYYY-MM-DD"
  pickup_time_slot: 'morning' | 'afternoon' | 'evening';
  pickup_address?: string;                // Optional override
  pickup_pincode?: string;
  pickup_phone?: string;
}

export interface VelocitySchedulePickupResponse {
  awb: string;
  pickup_id: string;
  scheduled_date: string;
  time_slot: string;
  status: 'scheduled' | 'confirmed' | 'failed';
  message: string;
}

export interface VelocityCancelReverseShipmentRequest {
  reverse_awb: string;
  original_awb: string;
  reason?: string;
}

export interface VelocityCancelReverseShipmentResponse {
  message: string;
  reverse_awb: string;
  original_awb: string;
  status: string;
}

// ==================== SETTLEMENT ====================

export interface VelocitySettlementRequest {
  remittance_id: string;
  settlement_date?: string; // Optional: "YYYY-MM-DD"
}

export interface VelocitySettlementResponse {
  settlement_id: string;
  remittance_id: string;
  status: 'pending' | 'settled' | 'failed' | 'processing';
  settlement_date?: string;
  settled_amount: number;
  utr_number?: string;
  settled_at?: string; // ISO timestamp
  bank_details?: {
    account_number?: string;
    ifsc?: string;
    bank_name?: string;
  };
  failure_reason?: string;
}

// ==================== NDR ACTIONS ====================

export interface VelocityReattemptRequest {
  awb: string;
  preferred_date?: string; // "YYYY-MM-DD"
  notes?: string;
}

export interface VelocityReattemptResponse {
  awb: string;
  status: string;
  message: string;
}

export interface VelocityAddressUpdateRequest {
  awb: string;
  delivery_address: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  phone?: string;
}

export interface VelocityAddressUpdateResponse {
  awb: string;
  status: string;
  message: string;
}

// ==================== SPLIT FLOW - FORWARD ORDER ====================

export interface VelocityForwardOrderOnlyResponse {
  pickup_location_added: number;
  order_created: number;
  awb_generated: number;  // Will be 0
  pickup_generated: number;  // Will be 0
  shipment_id: string;  // KEY: Needed for assignCourier step
  order_id: string;
  assigned_date_time: { date: string; timezone_type: number; timezone: string };
  applied_weight: number | null;
  cod: number;
  label_url: string | null;
  manifest_url: string | null;
  routing_code: string | null;
  rto_routing_code: string | null;
  pickup_token_number: string | null;
}

export interface VelocityAssignCourierRequest {
  shipment_id: string;
  carrier_id?: string;  // Optional - auto-assign if blank
}

// ==================== SPLIT FLOW - REVERSE ORDER ====================

export interface VelocityReverseOrderOnlyResponse {
  order_created: number;
  awb_generated: number;  // Will be 0
  pickup_generated: number;  // Will be 0
  pickup_scheduled_date: string | null;
  order_id: string;
  return_id: string;  // KEY: Needed for assignReverseCourier step
  assigned_date_time: { date: string; timezone_type: number; timezone: string };
  cod: number;
}

export interface VelocityAssignReverseCourierRequest {
  return_id: string;
  warehouse_id: string;
  carrier_id?: string;  // Optional
}

// ==================== REPORTS API ====================

export interface VelocityReportsRequest {
  start_date_time: string;  // ISO 8601 format
  end_date_time: string;
  shipment_type: 'forward' | 'return';
}

export interface VelocityReportsSummary {
  count: number;
  sum_of_prepaid_orders: number;
  sum_of_cod_orders: number;
}

export interface VelocityReportsResponse {
  date_range: { start_date_time: string; end_date_time: string };
  shipment_type: 'forward' | 'return';
  summary: {
    // Forward statuses
    pickup_pending?: VelocityReportsSummary;
    in_transit?: VelocityReportsSummary;
    delivered?: VelocityReportsSummary;
    rto_in_transit?: VelocityReportsSummary;
    rto_delivered?: VelocityReportsSummary;
    lost?: VelocityReportsSummary;
    cancelled?: VelocityReportsSummary;
    // Return statuses
    return_pickup_scheduled?: VelocityReportsSummary;
    return_in_transit?: VelocityReportsSummary;
    return_delivered?: VelocityReportsSummary;
    return_lost?: VelocityReportsSummary;
    total_shipments: number;
  };
}

// ==================== ENHANCED SERVICEABILITY ====================

export interface VelocityServiceabilityResult {
  carrier_id: string;
  carrier_name: string;
}

export interface VelocityServiceabilityResponseFull {
  serviceability_results: VelocityServiceabilityResult[];
  zone: string;  // 'zone_a', 'zone_b', etc.
}

// ==================== TOKEN STORAGE ====================

export interface VelocityTokenData {
  token: string;                          // Encrypted
  createdAt: Date;
  expiresAt: Date;                        // createdAt + 24 hours
  isActive: boolean;
  companyId: string;
}
