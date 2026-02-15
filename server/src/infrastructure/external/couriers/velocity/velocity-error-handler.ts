/**
 * Velocity Shipfast Error Handler
 *
 * Handles:
 * - Error classification and mapping (Shipfast-specific error codes)
 * - Retry logic with exponential backoff
 * - Rate limiting (token bucket algorithm)
 *
 * Shipfast API Error Codes:
 *   400 → Validation error in request parameters
 *   401 → Authorization failed (invalid/missing credentials)
 *   422 → Waybill operation failed OR Cancellation failed
 *
 * @see docs/Resources/API/Courier/Shipfast/Shipfast_API.md
 */

import logger from '../../../../shared/logger/winston.logger';
import { VelocityError, VelocityErrorType } from './velocity.types';

// ──────────────────────────────────────────────
// Shipfast 422 Sub-Classification
// ──────────────────────────────────────────────

/**
 * Context keywords used to classify 422 errors by operation.
 * Shipfast returns 422 for multiple distinct failure modes:
 *   - Waybill operations (AWB generation, shipment assignment)
 *   - Cancellation failures (shipment already picked up, delivered, etc.)
 *   - Serviceability (pincode not serviceable)
 *   - Order creation (duplicate order_id, invalid warehouse_id)
 */
const CANCEL_KEYWORDS = ['cancel', 'cancellation'];
const WAYBILL_KEYWORDS = ['waybill', 'awb', 'shipment_id', 'assign', 'courier'];
const SERVICEABILITY_KEYWORDS = ['pincode', 'serviceab', 'not serviceable', 'no carriers'];
const ORDER_KEYWORDS = ['order', 'duplicate', 'already exists'];
const WAREHOUSE_KEYWORDS = ['warehouse', 'pickup_location'];

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/**
 * Classify a Shipfast 422 error into a specific VelocityErrorType.
 *
 * Inspects both the response body and calling context to determine
 * whether the 422 is a waybill failure, cancellation failure,
 * serviceability issue, or order creation issue.
 */
function classifyShipfast422(data: any, context?: string): VelocityErrorType {
  const errorMsg = String(data?.message || data?.error || '');
  const errorsObj = JSON.stringify(data?.errors || {});
  const combined = `${errorMsg} ${errorsObj} ${context || ''}`;

  // Priority 1: Cancellation failure
  if (matchesKeywords(combined, CANCEL_KEYWORDS)) {
    return VelocityErrorType.CANNOT_CANCEL;
  }

  // Priority 2: Waybill / shipment assignment failure
  if (matchesKeywords(combined, WAYBILL_KEYWORDS)) {
    return VelocityErrorType.WAYBILL_FAILED;
  }

  // Priority 3: Serviceability / pincode issue
  if (matchesKeywords(combined, SERVICEABILITY_KEYWORDS)) {
    return VelocityErrorType.NOT_SERVICEABLE;
  }

  // Priority 4: Order creation failure (duplicate, invalid fields)
  if (matchesKeywords(combined, ORDER_KEYWORDS)) {
    return VelocityErrorType.ORDER_CREATION_FAILED;
  }

  // Priority 5: Warehouse-related
  if (matchesKeywords(combined, WAREHOUSE_KEYWORDS)) {
    return VelocityErrorType.WAREHOUSE_NOT_FOUND;
  }

  // Default: generic API error
  return VelocityErrorType.API_ERROR;
}

/**
 * Classify a Shipfast 400 validation error into a specific VelocityErrorType.
 * Most 400s are validation, but some carry warehouse/order-specific context.
 */
function classifyShipfast400(data: any, context?: string): VelocityErrorType {
  const errorMsg = String(data?.message || data?.error || '');
  const errorsObj = JSON.stringify(data?.errors || {});
  const combined = `${errorMsg} ${errorsObj} ${context || ''}`;

  if (matchesKeywords(combined, WAREHOUSE_KEYWORDS)) {
    return VelocityErrorType.WAREHOUSE_NOT_FOUND;
  }

  return VelocityErrorType.VALIDATION_ERROR;
}

// ──────────────────────────────────────────────
// Build structured error message
// ──────────────────────────────────────────────

/**
 * Build a human-readable error message from Shipfast response data.
 * Extracts field-level validation errors when available.
 */
function buildErrorMessage(data: any, fallback: string): string {
  const msg = data?.message || data?.error || fallback;

  // Shipfast sometimes returns field-level errors in `errors` object
  if (data?.errors && typeof data.errors === 'object') {
    const fieldErrors = Object.entries(data.errors)
      .map(([field, err]) => `${field}: ${err}`)
      .join('; ');
    if (fieldErrors) {
      return `${msg} [${fieldErrors}]`;
    }
  }

  return msg;
}

// ──────────────────────────────────────────────
// Main Error Handler
// ──────────────────────────────────────────────

/**
 * Handle Velocity API errors and convert to VelocityError
 *
 * Maps HTTP status codes and Shipfast-specific response bodies
 * to typed, retryable VelocityError instances.
 */
export function handleVelocityError(error: any, context?: string): VelocityError {
  const errorContext = context || 'Velocity API';

  // Already a VelocityError
  if (error instanceof VelocityError) {
    return error;
  }

  // Axios error with HTTP response
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    logger.debug('Velocity API error response', {
      context: errorContext,
      status,
      data: typeof data === 'object' ? JSON.stringify(data).slice(0, 500) : data,
    });

    switch (status) {
      case 401:
        return new VelocityError(
          401,
          {
            message: buildErrorMessage(data, 'Velocity authentication failed'),
            error: data?.error || data?.message,
            status_code: 401
          },
          false, // Not retryable — need to refresh token
          VelocityErrorType.AUTHENTICATION_ERROR
        );

      case 400:
        return new VelocityError(
          400,
          {
            message: buildErrorMessage(data, 'Validation failed'),
            errors: data?.errors || {},
            error: data?.message,
            status_code: 400
          },
          false, // Not retryable — fix validation errors
          classifyShipfast400(data, context)
        );

      case 404: {
        // Determine if this is a shipment or warehouse not found
        const msg404 = String(data?.message || data?.error || '');
        const type404 = matchesKeywords(msg404, WAREHOUSE_KEYWORDS)
          ? VelocityErrorType.WAREHOUSE_NOT_FOUND
          : matchesKeywords(msg404, WAYBILL_KEYWORDS.concat(['shipment', 'order']))
            ? VelocityErrorType.SHIPMENT_NOT_FOUND
            : VelocityErrorType.API_ERROR;

        return new VelocityError(
          404,
          {
            message: data?.message || 'Resource not found',
            error: data?.error,
            status_code: 404
          },
          false, // Not retryable
          type404
        );
      }

      case 422:
        return new VelocityError(
          422,
          {
            message: buildErrorMessage(data, 'Operation failed'),
            errors: data?.errors,
            error: data?.error || data?.message,
            status_code: 422
          },
          false, // Not retryable
          classifyShipfast422(data, context)
        );

      case 429:
        return new VelocityError(
          429,
          {
            message: 'Rate limit exceeded',
            error: 'Too many requests',
            status_code: 429
          },
          true, // Retryable after delay
          VelocityErrorType.RATE_LIMIT_EXCEEDED
        );

      case 500:
      case 502:
      case 503:
      case 504:
        return new VelocityError(
          status,
          {
            message: buildErrorMessage(data, 'Velocity API server error'),
            error: data?.error || data?.message || 'Internal server error',
            status_code: status
          },
          true, // Retryable
          VelocityErrorType.API_ERROR
        );

      default:
        return new VelocityError(
          status,
          {
            message: buildErrorMessage(data, `${errorContext} error`),
            error: data?.error || data?.message || 'Unknown error',
            status_code: status
          },
          status >= 500, // Retryable only for server errors
          VelocityErrorType.API_ERROR
        );
    }
  }

  // Timeout error
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return new VelocityError(
      408,
      {
        message: 'Request timeout',
        error: error.message,
        status_code: 408
      },
      true, // Retryable
      VelocityErrorType.TIMEOUT_ERROR
    );
  }

  // Network error
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
    return new VelocityError(
      503,
      {
        message: 'Network error - service unavailable',
        error: error.message,
        status_code: 503
      },
      true, // Retryable
      VelocityErrorType.NETWORK_ERROR
    );
  }

  // Generic error
  return new VelocityError(
    500,
    {
      message: `${errorContext} error`,
      error: error.message || 'Unknown error',
      status_code: 500
    },
    true, // Retryable by default
    VelocityErrorType.API_ERROR
  );
}

/**
 * Retry a function with exponential backoff
 *
 * @param fn - Function to retry
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds (default: 1000)
 * @param context - Context for logging
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
  context?: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Convert to VelocityError if not already
      const velocityError = error instanceof VelocityError
        ? error
        : handleVelocityError(error, context);

      // Don't retry if not retryable
      if (!velocityError.isRetryable || attempt === maxRetries - 1) {
        throw velocityError;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      const jitter = Math.random() * 0.3 * delay; // Add 0-30% jitter
      const totalDelay = Math.floor(delay + jitter);

      logger.warn(`Velocity API error, retrying`, {
        context,
        attempt: attempt + 1,
        maxRetries,
        delay: totalDelay,
        error: velocityError.message,
        statusCode: velocityError.statusCode,
        errorType: velocityError.errorType,
      });

      await sleep(totalDelay);
    }
  }

  throw lastError || new Error('Retry failed');
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Rate Limiter using Token Bucket Algorithm
 *
 * Ensures API calls don't exceed rate limits
 */
export class RateLimiter {
  private tokens: number;
  private capacity: number;
  private refillRate: number;
  private lastRefill: number;

  /**
   * @param capacity - Maximum number of tokens (burst capacity)
   * @param refillPerMinute - Number of tokens to refill per minute
   */
  constructor(capacity: number, refillPerMinute: number) {
    this.tokens = capacity;
    this.capacity = capacity;
    this.refillRate = refillPerMinute / 60000; // Convert to per millisecond
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token, waiting if necessary
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens--;
      return;
    }

    // Calculate wait time
    const waitTime = Math.ceil((1 - this.tokens) / this.refillRate);

    logger.debug('Rate limit wait', {
      waitTime,
      tokensAvailable: this.tokens,
      capacity: this.capacity
    });

    await sleep(waitTime);
    this.tokens = 0;
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = elapsed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + newTokens);
    this.lastRefill = now;
  }

  /**
   * Check if tokens are available without consuming
   */
  hasTokens(): boolean {
    this.refill();
    return this.tokens >= 1;
  }

  /**
   * Reset the rate limiter (for testing)
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

/**
 * Rate limiters for different Velocity endpoints
 */
export const VelocityRateLimiters = {
  authentication: new RateLimiter(10, 10),      // 10 requests/min
  forwardOrder: new RateLimiter(100, 100),      // 100 requests/min
  tracking: new RateLimiter(100, 100),          // 100 requests/min
  cancellation: new RateLimiter(50, 50),        // 50 requests/min
  serviceability: new RateLimiter(200, 200),    // 200 requests/min
  warehouse: new RateLimiter(20, 20),           // 20 requests/min
  reverseShipment: new RateLimiter(50, 50),     // 50 requests/min (RTO creation)
  schedulePickup: new RateLimiter(30, 30),      // 30 requests/min (pickup scheduling)
  cancelReverseShipment: new RateLimiter(30, 30), // 30 requests/min (RTO cancellation)
  forwardOrderOnly: new RateLimiter(100, 100),
  assignCourier: new RateLimiter(100, 100),
  reverseOrderOnly: new RateLimiter(50, 50),
  assignReverseCourier: new RateLimiter(50, 50),
  reports: new RateLimiter(20, 20),
};
