/**
 * Integration Error Handling Utilities
 * 
 * Provides error parsing, classification, and user-friendly messaging
 * for integration-related errors.
 */

import type { IntegrationType } from './useIntegrationState';

export interface IntegrationError {
    code: string;
    message: string;
    suggestion?: string;
    retryable: boolean;
    retryCount?: number;
    originalError?: any;
}

export type ErrorCode =
    | 'TIMEOUT'
    | 'RATE_LIMIT'
    | 'INVALID_CREDENTIALS'
    | 'EXPIRED_TOKEN'
    | 'NETWORK_ERROR'
    | 'INVALID_DOMAIN'
    | 'PERMISSION_DENIED'
    | 'SERVER_ERROR'
    | 'UNKNOWN';

/**
 * Parse error from API response
 */
export function parseIntegrationError(error: any, retryCount = 0): IntegrationError {
    // Handle timeout errors
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
        return {
            code: 'TIMEOUT',
            message: 'Request timed out',
            suggestion: 'Please check your internet connection and try again.',
            retryable: true,
            retryCount,
            originalError: error,
        };
    }

    // Handle network errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message?.includes('Network')) {
        return {
            code: 'NETWORK_ERROR',
            message: 'Network error occurred',
            suggestion: 'Please check your internet connection.',
            retryable: true,
            retryCount,
            originalError: error,
        };
    }

    // Handle HTTP status codes
    if (error.response?.status) {
        const status = error.response.status;

        if (status === 429) {
            return {
                code: 'RATE_LIMIT',
                message: 'Too many requests',
                suggestion: 'Please wait a moment before trying again.',
                retryable: false,
                retryCount,
                originalError: error,
            };
        }

        if (status === 401 || status === 403) {
            return {
                code: 'INVALID_CREDENTIALS',
                message: error.response.data?.message || 'Invalid credentials',
                suggestion: 'Please verify your API keys and permissions.',
                retryable: false,
                retryCount,
                originalError: error,
            };
        }

        if (status >= 500) {
            return {
                code: 'SERVER_ERROR',
                message: 'Server error occurred',
                suggestion: 'The service is temporarily unavailable. Please try again later.',
                retryable: true,
                retryCount,
                originalError: error,
            };
        }
    }

    // Handle specific error messages
    const errorMessage = error.message || error.response?.data?.message || '';

    if (errorMessage.includes('expired') || errorMessage.includes('token')) {
        return {
            code: 'EXPIRED_TOKEN',
            message: 'Access token has expired',
            suggestion: 'Please reconnect your store to refresh the token.',
            retryable: false,
            retryCount,
            originalError: error,
        };
    }

    if (errorMessage.includes('domain') || errorMessage.includes('shop')) {
        return {
            code: 'INVALID_DOMAIN',
            message: 'Invalid store domain',
            suggestion: 'Please verify your store domain is correct.',
            retryable: false,
            retryCount,
            originalError: error,
        };
    }

    if (errorMessage.includes('permission')) {
        return {
            code: 'PERMISSION_DENIED',
            message: 'Permission denied',
            suggestion: 'Please ensure you have admin access to the store.',
            retryable: false,
            retryCount,
            originalError: error,
        };
    }

    // Default unknown error
    return {
        code: 'UNKNOWN',
        message: errorMessage || 'An unexpected error occurred',
        suggestion: 'Please try again or contact support if the issue persists.',
        retryable: false,
        retryCount,
        originalError: error,
    };
}

/**
 * Get integration-specific error suggestion
 */
export function getErrorSuggestion(code: ErrorCode, type: IntegrationType): string {
    const suggestions: Record<ErrorCode, Partial<Record<IntegrationType, string>>> = {
        TIMEOUT: {
            SHOPIFY: 'Check your Shopify store is accessible and try again.',
            WOOCOMMERCE: 'Ensure your WooCommerce store is online and accessible.',
            AMAZON: 'Verify your Amazon Seller Central connection.',
            FLIPKART: 'Verify your Flipkart Seller Hub connection.',
        },
        RATE_LIMIT: {
            SHOPIFY: 'Shopify has rate limits. Please wait a moment before trying again.',
            WOOCOMMERCE: 'Your WooCommerce API has rate limits. Please wait before retrying.',
            AMAZON: 'Amazon API rate limit reached. Please wait before retrying.',
            FLIPKART: 'Flipkart API rate limit reached. Please wait before retrying.',
        },
        INVALID_CREDENTIALS: {
            SHOPIFY: 'Please verify your Shopify store domain and ensure OAuth was completed.',
            WOOCOMMERCE: 'Please check your Consumer Key and Consumer Secret are correct.',
            AMAZON: 'Please verify your Access Key ID and Secret Access Key.',
            FLIPKART: 'Please verify your API credentials are correct.',
        },
        EXPIRED_TOKEN: {
            SHOPIFY: 'Your Shopify access token has expired. Please reconnect your store.',
            WOOCOMMERCE: 'Your WooCommerce API keys may have been revoked. Please regenerate them.',
            AMAZON: 'Your Amazon credentials may have expired. Please update them.',
            FLIPKART: 'Your Flipkart credentials may have expired. Please update them.',
        },
        NETWORK_ERROR: {
            SHOPIFY: 'Unable to reach Shopify. Please check your internet connection.',
            WOOCOMMERCE: 'Unable to reach your WooCommerce store. Please check the URL and your connection.',
            AMAZON: 'Unable to reach Amazon Seller Central. Please check your connection.',
            FLIPKART: 'Unable to reach Flipkart Seller Hub. Please check your connection.',
        },
        INVALID_DOMAIN: {
            SHOPIFY: 'Please enter a valid Shopify store domain (e.g., your-store.myshopify.com).',
            WOOCOMMERCE: 'Please enter a valid store URL (e.g., https://yourstore.com).',
            AMAZON: 'Please select a valid Amazon marketplace.',
            FLIPKART: 'Please verify your Flipkart seller ID.',
        },
        PERMISSION_DENIED: {
            SHOPIFY: 'You need admin access to connect this Shopify store.',
            WOOCOMMERCE: 'Ensure your API keys have read/write permissions.',
            AMAZON: 'Ensure your Amazon account has the required permissions.',
            FLIPKART: 'Ensure your Flipkart account has the required permissions.',
        },
        SERVER_ERROR: {
            SHOPIFY: 'Shopify is experiencing issues. Please try again later.',
            WOOCOMMERCE: 'Your WooCommerce store is experiencing issues. Please try again later.',
            AMAZON: 'Amazon Seller Central is experiencing issues. Please try again later.',
            FLIPKART: 'Flipkart Seller Hub is experiencing issues. Please try again later.',
        },
        UNKNOWN: {
            SHOPIFY: 'Unable to connect to Shopify. Please try again or contact support.',
            WOOCOMMERCE: 'Unable to connect to WooCommerce. Please try again or contact support.',
            AMAZON: 'Unable to connect to Amazon. Please try again or contact support.',
            FLIPKART: 'Unable to connect to Flipkart. Please try again or contact support.',
        },
    };

    return suggestions[code]?.[type] || 'Please try again or contact support if the issue persists.';
}

/**
 * Format error for display
 */
export function formatErrorMessage(error: IntegrationError, type: IntegrationType): string {
    const suggestion = error.suggestion || getErrorSuggestion(error.code as ErrorCode, type);

    if (error.retryCount && error.retryCount > 0) {
        return `${error.message} (Attempt ${error.retryCount + 1}). ${suggestion}`;
    }

    return `${error.message}. ${suggestion}`;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(error: IntegrationError): boolean {
    return error.retryable && (error.retryCount || 0) < 3;
}
