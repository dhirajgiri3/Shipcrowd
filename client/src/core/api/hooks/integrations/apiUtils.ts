/**
 * API Utilities for Integration Hooks
 * 
 * Provides retry logic, timeout handling, and error wrapping
 * for integration API calls.
 */

import { parseIntegrationError, type IntegrationError } from './integrationErrors';

export interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffMultiplier?: number;
    retryableErrors?: string[];
}

export interface TimeoutOptions {
    timeoutMs?: number;
    timeoutMessage?: string;
}

/**
 * Custom timeout error
 */
export class TimeoutError extends Error {
    constructor(message: string = 'Request timed out') {
        super(message);
        this.name = 'TimeoutError';
    }
}

/**
 * Wrap a promise with a timeout
 */
export async function withTimeout<T>(
    promise: Promise<T>,
    options: TimeoutOptions = {}
): Promise<T> {
    const { timeoutMs = 30000, timeoutMessage = 'Request timed out' } = options;

    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new TimeoutError(timeoutMessage)), timeoutMs)
        ),
    ]);
}

/**
 * Calculate delay for exponential backoff
 */
function calculateDelay(
    attempt: number,
    initialDelay: number,
    maxDelay: number,
    backoffMultiplier: number
): number {
    const delay = initialDelay * Math.pow(backoffMultiplier, attempt);
    return Math.min(delay, maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function withRetry<T>(
    fn: (attempt: number) => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 10000,
        backoffMultiplier = 2,
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn(attempt);
        } catch (error: any) {
            lastError = error;

            // Parse error to check if it's retryable
            const parsedError = parseIntegrationError(error, attempt);

            // Don't retry if we've hit max retries or error is not retryable
            if (attempt >= maxRetries || !parsedError.retryable) {
                throw error;
            }

            // Calculate delay and wait before retrying
            const delay = calculateDelay(attempt, initialDelay, maxDelay, backoffMultiplier);
            console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
            await sleep(delay);
        }
    }

    throw lastError;
}

/**
 * Combine timeout and retry logic
 */
export async function withTimeoutAndRetry<T>(
    fn: (attempt: number) => Promise<T>,
    timeoutOptions: TimeoutOptions = {},
    retryOptions: RetryOptions = {}
): Promise<T> {
    return withRetry(
        async (attempt) => withTimeout(fn(attempt), timeoutOptions),
        retryOptions
    );
}

/**
 * Wrap API call with comprehensive error handling
 */
export async function wrapApiCall<T>(
    fn: () => Promise<T>,
    options: {
        timeout?: TimeoutOptions;
        retry?: RetryOptions;
        onRetry?: (attempt: number, error: IntegrationError) => void;
    } = {}
): Promise<T> {
    const { timeout, retry, onRetry } = options;

    try {
        if (retry) {
            return await withRetry(
                async (attempt) => {
                    try {
                        const promise = fn();
                        return timeout ? await withTimeout(promise, timeout) : await promise;
                    } catch (error) {
                        const parsedError = parseIntegrationError(error, attempt);
                        if (onRetry && parsedError.retryable) {
                            onRetry(attempt, parsedError);
                        }
                        throw error;
                    }
                },
                retry
            );
        } else if (timeout) {
            return await withTimeout(fn(), timeout);
        } else {
            return await fn();
        }
    } catch (error) {
        throw parseIntegrationError(error);
    }
}
