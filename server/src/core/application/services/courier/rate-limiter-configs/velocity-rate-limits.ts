/**
 * Velocity Shipfast Rate Limiter Configuration
 * 
 * Velocity does not document any rate limits in their API documentation.
 * Rate limiting is DISABLED for Velocity to allow unlimited requests.
 * 
 * If Velocity introduces rate limits in the future, update this config.
 */

import { RateLimiterConfig } from './rate-limiter.service';

export const VELOCITY_RATE_LIMITER_CONFIG: RateLimiterConfig = {
    courier: 'velocity',
    enabled: false, // No documented rate limits
    rules: []       // No rules needed when disabled
};
