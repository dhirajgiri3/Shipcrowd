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
  payment_method: 'COD' | 'PREPAID';
  sub_total: number;
  length: number;                         // cm
  breadth: number;                        // cm
  height: number;                         // cm
  weight: number;                         // kg
  cod_collectible?: number;               // Required for COD
  pickup_location: string;
  warehouse_id: string;
  vendor_details?: VelocityVendorDetails;
}

export interface VelocityShipmentResponse {
  shipment_id: string;
  order_id: string;
  awb: string;
  courier_name: string;
  courier_company_id: string;
  label_url: string;
  manifest_url?: string;
  status: string;
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
}

// ==================== SERVICEABILITY ====================

export interface VelocityServiceabilityRequest {
  pickup_pincode: string;
  delivery_pincode: string;
  cod: 0 | 1;                            // 1 = COD, 0 = Prepaid
  weight: number;                         // kg
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
  awb: string;
}

export interface VelocityCancelResponse {
  message: string;
  awb: string;
  status: string;
}

// ==================== WAREHOUSE ====================

export interface VelocityWarehouseRequest {
  name: string;
  phone: string;
  email: string;
  address: string;
  address_2?: string;
  city: string;
  state: string;
  country: string;
  pin_code: string;
  return_address: string;
  return_city: string;
  return_state: string;
  return_country: string;
  return_pin_code: string;
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

  constructor(statusCode: number, velocityError: VelocityAPIError, isRetryable: boolean = false) {
    super(velocityError.message);
    this.name = 'VelocityError';
    this.statusCode = statusCode;
    this.velocityError = velocityError;
    this.isRetryable = isRetryable;

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

// ==================== TOKEN STORAGE ====================

export interface VelocityTokenData {
  token: string;                          // Encrypted
  createdAt: Date;
  expiresAt: Date;                        // createdAt + 24 hours
  isActive: boolean;
  companyId: string;
}
