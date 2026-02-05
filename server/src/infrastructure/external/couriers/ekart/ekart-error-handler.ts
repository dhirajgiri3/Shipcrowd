/**
 * Ekart Error Handler & Circuit Breaker
 * 
 * Implements resilience patterns for Ekart API calls:
 * - Circuit breaker to prevent cascading failures
 * - Exponential backoff retry logic
 * - Error classification (retryable vs permanent)
 * - Automatic recovery after cooldown period
 * 
 * Circuit Breaker States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Too many failures, reject requests immediately
 * - HALF_OPEN: Testing if service recovered, allow limited requests
 * 
 * @example
 * ```typescript
 * const circuitBreaker = new EkartCircuitBreaker();
 * 
 * const result = await circuitBreaker.execute(async () => {
 *   return await retryWithBackoff(
 *     () => axios.post('/api/endpoint', data),
 *     3,  // max retries
 *     1000  // initial delay
 *   );
 * });
 * ```
 */

import logger from '../../../../shared/logger/winston.logger';
import { EkartError } from './ekart.types';

// ==================== Circuit Breaker ====================

export enum CircuitState {
    CLOSED = 'CLOSED',     // Normal operation
    OPEN = 'OPEN',         // Failing, reject requests
    HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

export interface CircuitBreakerConfig {
    failureThreshold: number;  // Number of failures before opening circuit
    cooldownMs: number;        // Time to wait before attempting recovery
    successThreshold: number;  // Successes needed in HALF_OPEN to close circuit
}

export class EkartCircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private successCount: number = 0;
    private lastFailureTime: number = 0;
    private config: CircuitBreakerConfig;

    constructor(config?: Partial<CircuitBreakerConfig>) {
        this.config = {
            failureThreshold: config?.failureThreshold || 5,
            cooldownMs: config?.cooldownMs || 60000, // 1 minute
            successThreshold: config?.successThreshold || 2,
        };

        logger.info('EkartCircuitBreaker initialized', {
            config: this.config,
        });
    }

    /**
     * Execute function with circuit breaker protection
     * 
     * @param fn Function to execute
     * @returns Result of function execution
     * @throws Error if circuit is OPEN
     */
    async execute<T>(fn: () => Promise<T>): Promise<T> {
        // Check if circuit should transition from OPEN to HALF_OPEN
        if (this.state === CircuitState.OPEN) {
            const timeSinceLastFailure = Date.now() - this.lastFailureTime;

            if (timeSinceLastFailure >= this.config.cooldownMs) {
                logger.info('Circuit breaker transitioning to HALF_OPEN', {
                    timeSinceLastFailure,
                    cooldownMs: this.config.cooldownMs,
                });
                this.state = CircuitState.HALF_OPEN;
                this.successCount = 0;
            } else {
                throw new Error(
                    `Circuit breaker is OPEN. Cooldown: ${this.config.cooldownMs - timeSinceLastFailure}ms remaining`
                );
            }
        }

        try {
            const result = await fn();

            // Success - handle state transitions
            if (this.state === CircuitState.HALF_OPEN) {
                this.successCount++;

                if (this.successCount >= this.config.successThreshold) {
                    logger.info('Circuit breaker closing after successful recovery', {
                        successCount: this.successCount,
                    });
                    this.state = CircuitState.CLOSED;
                    this.failureCount = 0;
                    this.successCount = 0;
                }
            } else if (this.state === CircuitState.CLOSED) {
                // Reset failure count on success
                this.failureCount = 0;
            }

            return result;
        } catch (error) {
            // Failure - increment counter and potentially open circuit
            this.failureCount++;
            this.lastFailureTime = Date.now();

            logger.warn('Circuit breaker recorded failure', {
                state: this.state,
                failureCount: this.failureCount,
                threshold: this.config.failureThreshold,
            });

            if (this.failureCount >= this.config.failureThreshold) {
                // Only transition to OPEN if not already OPEN
                if (this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN) {
                    logger.error('ALERT: Ekart Circuit Breaker OPENING - Too many failures', {
                        alert: true,
                        component: 'EkartIntegration',
                        metric: 'circuit_breaker_open',
                        failureCount: this.failureCount,
                        threshold: this.config.failureThreshold,
                    });
                    this.state = CircuitState.OPEN;
                }
            }

            throw error;
        }
    }

    /**
     * Get current circuit breaker state
     */
    getState(): CircuitState {
        return this.state;
    }

    /**
     * Get failure count
     */
    getFailureCount(): number {
        return this.failureCount;
    }

    /**
     * Reset circuit breaker (useful for testing)
     */
    reset(): void {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailureTime = 0;

        logger.info('Circuit breaker reset');
    }
}

// ==================== Retry with Backoff ====================

/**
 * Retry function with exponential backoff
 * 
 * Implements exponential backoff with jitter to prevent thundering herd
 * 
 * @param fn Function to retry
 * @param maxRetries Maximum number of retry attempts
 * @param initialDelayMs Initial delay in milliseconds
 * @param maxDelayMs Maximum delay cap (default 30s)
 * @returns Result of function execution
 * @throws Last error if all retries exhausted
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelayMs: number = 1000,
    maxDelayMs: number = 30000
): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Check if error is retryable
            if (!isRetryableError(error)) {
                logger.warn('Non-retryable error encountered, aborting retries', {
                    attempt,
                    error: error.message,
                    statusCode: error.response?.status,
                });
                throw error;
            }

            // Last attempt - don't delay, just throw
            if (attempt === maxRetries) {
                logger.error('Max retries exhausted', {
                    maxRetries,
                    error: error.message,
                });
                throw error;
            }

            // Calculate delay with exponential backoff + jitter
            const exponentialDelay = initialDelayMs * Math.pow(2, attempt);
            const jitter = Math.random() * 0.3 * exponentialDelay; // ±30% jitter
            const delay = Math.min(exponentialDelay + jitter, maxDelayMs);

            logger.info('Retrying after backoff', {
                attempt: attempt + 1,
                maxRetries,
                delayMs: Math.round(delay),
                error: error.message,
            });

            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

// ==================== Error Classification ====================

/**
 * Determine if error is retryable
 * 
 * Retryable errors:
 * - Network errors (ECONNRESET, ETIMEDOUT, etc.)
 * - 5xx server errors
 * - 429 rate limit (with backoff)
 * - 408 request timeout
 * 
 * Non-retryable errors:
 * - 4xx client errors (except 408, 429)
 * - Authentication errors (401, 403)
 * - Validation errors (400)
 * 
 * @param error Error object
 * @returns true if error is retryable
 */
export function isRetryableError(error: any): boolean {
    // Network errors are retryable
    if (error.code) {
        const retryableNetworkCodes = [
            'ECONNRESET',
            'ETIMEDOUT',
            'ECONNREFUSED',
            'ENOTFOUND',
            'ENETUNREACH',
        ];

        if (retryableNetworkCodes.includes(error.code)) {
            return true;
        }
    }

    // HTTP status code errors
    const status = error.statusCode || error.response?.status || error.response?.status_code;

    if (!status) {
        // No status = network error, retry
        return true;
    }

    // 5xx server errors - retry
    if (status >= 500) {
        return true;
    }

    // 429 rate limit - retry with backoff
    if (status === 429) {
        return true;
    }

    // 408 request timeout - retry
    if (status === 408) {
        return true;
    }

    // 4xx client errors - don't retry
    if (status >= 400 && status < 500) {
        return false;
    }

    // Default: retry
    return true;
}

/**
 * Handle Ekart API error and convert to EkartError
 * 
 * Extracts error details from Axios error response
 * Classifies error as retryable or not
 * 
 * @param error Axios error
 * @param context Additional context for logging
 * @returns EkartError instance
 */
export function handleEkartError(error: any, context?: Record<string, any>): EkartError {
    const statusCode = error.response?.status || 500;
    const responseData = error.response?.data || {};

    // Extract retry-after header for 429 errors
    const retryAfter = error.response?.headers?.['retry-after'];
    const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;

    const ekartError = new EkartError(
        statusCode,
        {
            message: responseData.message || error.message || 'Unknown Ekart API error',
            error: responseData,
            status_code: statusCode,
            retryAfter: retryAfterSeconds,
        },
        isRetryableError(error)
    );

    logger.error('Ekart API error', {
        statusCode,
        message: ekartError.message,
        isRetryable: ekartError.isRetryable,
        retryAfter: retryAfterSeconds,
        ...context,
    });

    return ekartError;
}

/**
 * Wait for rate limit cooldown
 * 
 * Respects Retry-After header if present
 * Otherwise uses exponential backoff
 * 
 * @param error EkartError with retryAfter info
 * @param attempt Current retry attempt
 */
export async function waitForRateLimit(error: EkartError, attempt: number = 0): Promise<void> {
    let waitMs: number;

    if (error.response.retryAfter) {
        // Use Retry-After header
        waitMs = error.response.retryAfter * 1000;
    } else {
        // Exponential backoff: 1s, 2s, 4s, 8s...
        waitMs = Math.min(1000 * Math.pow(2, attempt), 30000);
    }

    logger.info('Waiting for rate limit cooldown', {
        waitMs,
        retryAfter: error.response.retryAfter,
        attempt,
    });

    await new Promise((resolve) => setTimeout(resolve, waitMs));
}
