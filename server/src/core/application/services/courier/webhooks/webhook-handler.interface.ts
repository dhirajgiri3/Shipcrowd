/**
 * Standardized Webhook Handler Interface
 * 
 * Defines the contract for all courier webhook handlers.
 * Ensures consistent signature verification, parsing, and processing patterns.
 */

import { Request } from 'express';

/**
 * Standardized webhook payload structure
 */
export interface WebhookPayload {
    courier: string;                        // Courier identifier
    awb: string;                            // Tracking/AWB number
    event: string;                          // Event type (e.g., 'status_update')
    status: string;                         // Courier-specific status code
    timestamp: Date;                        // Event timestamp
    rawPayload: any;                        // Original courier payload
    metadata: Record<string, any>;          // Courier-specific extras
}

/**
 * Webhook handler interface - all courier handlers must implement this
 */
export interface IWebhookHandler {
    /**
     * Verify webhook authenticity using signature, API key, or IP whitelist
     * @param req Express request object
     * @returns true if webhook is legitimate
     */
    verifySignature(req: Request): boolean | Promise<boolean>;

    /**
     * Parse courier-specific webhook payload to standard format
     * @param req Express request object
     * @returns Standardized webhook payload
     */
    parseWebhook(req: Request): WebhookPayload;

    /**
     * Process webhook (update DB, trigger events, etc.)
     * @param payload Standardized webhook payload
     */
    handleWebhook(payload: WebhookPayload): Promise<void>;

    /**
     * Generate idempotency key for deduplication
     * @param payload Standardized webhook payload
     * @returns Unique key for this webhook event
     */
    getIdempotencyKey(payload: WebhookPayload): string;
}

/**
 * Signature verification strategy
 */
export enum VerificationStrategy {
    HMAC_SHA256 = 'hmac_sha256',           // Signature-based (Shopify, Stripe)
    API_KEY = 'api_key',                   // API key in header
    IP_WHITELIST = 'ip_whitelist',         // IP address validation
    NONE = 'none'                          // No verification (dev only)
}

/**
 * Webhook configuration
 */
export interface WebhookConfig {
    courier: string;
    verificationStrategy: VerificationStrategy;
    signatureHeader?: string;               // Header containing signature (if applicable)
    secretKey?: string;                     // Secret for HMAC (if applicable)
    apiKeyHeader?: string;                  // Header containing API key (if applicable)
    allowedIPs?: string[];                  // Allowed IP addresses (if using IP whitelist)
}
