
import logger from '../logger/winston.logger';

// ==================== Circuit Breaker ====================

export enum CircuitState {
    CLOSED = 'CLOSED',     // Normal operation
    OPEN = 'OPEN',         // Failing, reject requests
    HALF_OPEN = 'HALF_OPEN' // Testing recovery
}

export interface CircuitBreakerConfig {
    name?: string;             // Name for logging
    failureThreshold: number;  // Number of failures before opening circuit
    cooldownMs: number;        // Time to wait before attempting recovery
    successThreshold: number;  // Successes needed in HALF_OPEN to close circuit
}

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private successCount: number = 0;
    private lastFailureTime: number = 0;
    private config: CircuitBreakerConfig;

    constructor(config?: Partial<CircuitBreakerConfig>) {
        this.config = {
            name: config?.name || 'CircuitBreaker',
            failureThreshold: config?.failureThreshold || 5,
            cooldownMs: config?.cooldownMs || 60000, // 1 minute
            successThreshold: config?.successThreshold || 2,
        };

        logger.info(`[${this.config.name}] Initialized`, {
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
                logger.info(`[${this.config.name}] Transitioning to HALF_OPEN`, {
                    timeSinceLastFailure,
                    cooldownMs: this.config.cooldownMs,
                });
                this.state = CircuitState.HALF_OPEN;
                this.successCount = 0;
            } else {
                throw new Error(
                    `[${this.config.name}] Circuit is OPEN. Cooldown: ${this.config.cooldownMs - timeSinceLastFailure}ms remaining`
                );
            }
        }

        try {
            const result = await fn();

            // Success - handle state transitions
            if (this.state === CircuitState.HALF_OPEN) {
                this.successCount++;

                if (this.successCount >= this.config.successThreshold) {
                    logger.info(`[${this.config.name}] Closing circuit after successful recovery`, {
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

            logger.warn(`[${this.config.name}] Recorded failure`, {
                state: this.state,
                failureCount: this.failureCount,
                threshold: this.config.failureThreshold,
                error: error instanceof Error ? error.message : String(error)
            });

            if (this.failureCount >= this.config.failureThreshold) {
                // Only transition to OPEN if not already OPEN
                if (this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN) {
                    logger.error(`ALERT: [${this.config.name}] Circuit OPENING - Too many failures`, {
                        alert: true,
                        component: this.config.name,
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

        logger.info(`[${this.config.name}] Reset manually`);
    }
}

// ==================== Retry with Backoff ====================

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
    // Check for explicit property (e.g. custom error classes)
    if (typeof error.isRetryable === 'boolean') {
        return error.isRetryable;
    }

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
    // Try to find status in various common locations
    const status = error.statusCode ||
        error.status ||
        error.response?.status ||
        error.response?.status_code;

    if (!status) {
        // No status = network error or unknown, retry to be safe
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
                // Don't log here, let the caller handle logging if needed
                throw error;
            }

            // Last attempt - don't delay, just throw
            if (attempt === maxRetries) {
                throw error;
            }

            // Calculate delay with exponential backoff + jitter
            const exponentialDelay = initialDelayMs * Math.pow(2, attempt);
            const jitter = Math.random() * 0.3 * exponentialDelay; // ±30% jitter
            const delay = Math.min(exponentialDelay + jitter, maxDelayMs);

            // Access retry-after header if available
            const retryAfterHeader = error.response?.headers?.['retry-after'];
            const waitMs = retryAfterHeader
                ? parseInt(retryAfterHeader, 10) * 1000
                : delay;

            logger.info(`Retrying operation after backoff`, {
                attempt: attempt + 1,
                maxRetries,
                delayMs: Math.round(waitMs),
                reason: error.message
            });

            await new Promise((resolve) => setTimeout(resolve, waitMs));
        }
    }

    throw lastError;
}
