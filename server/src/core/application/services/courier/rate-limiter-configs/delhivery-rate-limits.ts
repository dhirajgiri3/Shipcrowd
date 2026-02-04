/**
 * Delhivery B2C Rate Limiter Configuration
 * 
 * Delhivery enforces strict rate limits with 5-minute rolling windows.
 * These limits are per API token (per company/merchant).
 * 
 * Exceeding rate limits will result in 429 Too Many Requests errors.
 * 
 * Source: Delhivery B2C API Documentation (Rate Limits section)
 */

import { RateLimiterConfig } from './rate-limiter.service';

export const DELHIVERY_RATE_LIMITER_CONFIG: RateLimiterConfig = {
    courier: 'delhivery',
    enabled: true, // Delhivery has strict rate limits
    rules: [
        {
            endpoint: '/api/v1/packages/json/',
            maxRequests: 750,
            windowMs: 5 * 60 * 1000, // 5 minutes
        },
        {
            endpoint: '/api/p/packing_slip',
            maxRequests: 3000,
            windowMs: 5 * 60 * 1000, // 5 minutes
        },
        {
            endpoint: '/api/kinko/v1/invoice/charges/',
            maxRequests: 50,
            windowMs: 5 * 60 * 1000, // 5 minutes
        },
        {
            endpoint: '/c/api/pin-codes/json/',
            maxRequests: 4500,
            windowMs: 5 * 60 * 1000, // 5 minutes
        },
        {
            endpoint: '/api/cmu/create.json',
            maxRequests: 1000,
            windowMs: 5 * 60 * 1000, // 5 minutes (estimated, not documented)
        },
        {
            endpoint: '/api/p/edit',
            maxRequests: 500,
            windowMs: 5 * 60 * 1000, // 5 minutes (estimated, not documented)
        },
        {
            endpoint: '/api/cmu/cancel.json',
            maxRequests: 500,
            windowMs: 5 * 60 * 1000, // 5 minutes (estimated, not documented)
        }
    ]
};
