/**
 * Velocity Shipfast Error Handler
 *
 * Handles:
 * - Error classification and mapping
 * - Retry logic with exponential backoff
 * - Rate limiting (token bucket algorithm)
 *
 * @see docs/Development/Backend/Integrations/VELOCITY_SHIPFAST_INTEGRATION.md Section 6-7
 */

import { AxiosError } from 'axios';
import { VelocityError, VelocityErrorType, VelocityAPIError } from './velocity.types';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Handle Velocity API errors and convert to VelocityError
 */
export function handleVelocityError(error: any, context?: string): VelocityError {
  const errorContext = context || 'Velocity API';

  // Already a VelocityError
  if (error instanceof VelocityError) {
    return error;
  }

  // Axios error
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 401:
        return new VelocityError(
          401,
          {
            message: 'Velocity authentication failed',
            error: data.error || data.message,
            status_code: 401
          },
          false // Not retryable - need to refresh token
        );

      case 400:
        return new VelocityError(
          400,
          {
            message: 'Validation failed',
            errors: data.errors || {},
            error: data.message,
            status_code: 400
          },
          false // Not retryable - fix validation errors
        );

      case 404:
        return new VelocityError(
          404,
          {
            message: data.message || 'Resource not found',
            error: data.error,
            status_code: 404
          },
          false // Not retryable
        );

      case 422:
        return new VelocityError(
          422,
          {
            message: 'Pincode not serviceable or validation failed',
            error: data.message || data.error,
            status_code: 422
          },
          false // Not retryable
        );

      case 429:
        return new VelocityError(
          429,
          {
            message: 'Rate limit exceeded',
            error: 'Too many requests',
            status_code: 429
          },
          true // Retryable after delay
        );

      case 500:
      case 502:
      case 503:
      case 504:
        return new VelocityError(
          status,
          {
            message: 'Velocity API server error',
            error: data.error || data.message || 'Internal server error',
            status_code: status
          },
          true // Retryable
        );

      default:
        return new VelocityError(
          status,
          {
            message: `${errorContext} error`,
            error: data.error || data.message || 'Unknown error',
            status_code: status
          },
          status >= 500 // Retryable only for server errors
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
      true // Retryable
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
      true // Retryable
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
    true // Retryable by default
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
        statusCode: velocityError.statusCode
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
  authentication: new RateLimiter(10, 10),      // 10 requests/hour
  forwardOrder: new RateLimiter(100, 100),      // 100 requests/min
  tracking: new RateLimiter(100, 100),          // 100 requests/min
  cancellation: new RateLimiter(50, 50),        // 50 requests/min
  serviceability: new RateLimiter(200, 200),    // 200 requests/min
  warehouse: new RateLimiter(20, 20),           // 20 requests/min
  reverseShipment: new RateLimiter(50, 50),     // 50 requests/min (RTO creation)
  schedulePickup: new RateLimiter(30, 30),      // 30 requests/min (pickup scheduling)
  cancelReverseShipment: new RateLimiter(30, 30) // 30 requests/min (RTO cancellation)
};
