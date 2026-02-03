/**
 * Velocity Shipfast Webhook Types
 *
 * Type definitions for webhook payloads and events
 * @see docs/Development/Backend/Integrations/VELOCITY_SHIPFAST_INTEGRATION.md
 */

// ==================== WEBHOOK PAYLOAD ====================

export interface VelocityWebhookPayload {
  event_type: 'SHIPMENT_STATUS_UPDATE' | 'SHIPMENT_CREATED' | 'SHIPMENT_CANCELLED' | 'SHIPMENT_WEIGHT_SCANNED' | 'REVERSE_SHIPMENT_STATUS_UPDATE' | 'SETTLEMENT_COMPLETED';
  webhook_id?: string;                  // Optional unique ID for idempotency
  timestamp: string;                    // ISO 8601
  shipment_data?: {
    awb: string;
    order_id: string;
    status: string;
    status_code: string;
    courier_name: string;
    current_location?: string;
    estimated_delivery?: string;
    updated_at: string;
    description?: string;
  };
  weight_data?: {
    scanned_weight: number;             // Weight in grams or kg
    unit: 'kg' | 'g';                   // Weight unit
    scan_location?: string;             // Hub/facility where scanned
    scan_timestamp: string;             // ISO 8601
    scan_photo_url?: string;            // Optional weight photo
  };
  tracking_event?: {
    status: string;
    location: string;
    timestamp: string;
    description: string;
  };
  settlement_data?: {
    settlement_id: string;
    settlement_date: string;
    total_amount: number;
    currency: string;
    utr_number?: string;
    bank_details?: {
      account_number?: string;
      ifsc?: string;
      bank_name?: string;
    };
    shipments: Array<{
      awb: string;
      cod_amount: number;
      shipping_deduction: number;
      cod_charge: number;
      rto_charge?: number;
      net_amount: number;
    }>;
  };
}

// ==================== WEBHOOK SECURITY ====================

export interface VelocityWebhookHeaders {
  'x-velocity-signature': string;       // HMAC-SHA256 signature
  'x-velocity-timestamp': string;       // Unix timestamp
  'x-velocity-event-type': string;      // Event type for quick filtering
}

export interface WebhookVerificationResult {
  isValid: boolean;
  error?: string;
  computedSignature?: string;
}

// ==================== WEBHOOK EVENT PROCESSING ====================

export interface WebhookProcessingResult {
  success: boolean;
  awb: string;
  orderId: string;
  statusUpdated: boolean;
  error?: string;
  timestamp: Date;
}

export interface WebhookEventHandler {
  handleStatusUpdate(payload: VelocityWebhookPayload): Promise<WebhookProcessingResult>;
  handleShipmentCreated(payload: VelocityWebhookPayload): Promise<WebhookProcessingResult>;
  handleShipmentCancelled(payload: VelocityWebhookPayload): Promise<WebhookProcessingResult>;
}

// ==================== WEBHOOK RETRY CONFIGURATION ====================

export interface WebhookRetryConfig {
  maxRetries: number;
  retryDelays: number[];                // Exponential backoff delays in ms
  deadLetterQueueEnabled: boolean;
}

export const DEFAULT_WEBHOOK_RETRY_CONFIG: WebhookRetryConfig = {
  maxRetries: 3,
  retryDelays: [1000, 2000, 4000],      // 1s, 2s, 4s
  deadLetterQueueEnabled: true
};

// ==================== WEBHOOK MONITORING ====================

export interface WebhookMetrics {
  totalReceived: number;
  successfulProcessed: number;
  failedProcessed: number;
  averageProcessingTime: number;        // ms
  lastProcessedAt?: Date;
}

// ==================== DEAD LETTER QUEUE ====================

export interface DeadLetterQueueEntry {
  webhookPayload: VelocityWebhookPayload;
  receivedAt: Date;
  processingAttempts: number;
  lastError: string;
  lastAttemptAt: Date;
}
