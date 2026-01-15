/**
 * Rate Limiting Middleware
 * ISSUE #13: Protect sensitive endpoints from brute force attacks
 */

import rateLimit from 'express-rate-limit';
import logger from '../../../../shared/logger/winston.logger';

/**
 * Strict rate limiter for authentication endpoints
 * 5 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('Auth rate limit exceeded', {
            ip: req.ip,
            path: req.path,
        });
        res.status(429).json({
            success: false,
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts. Please try again in 15 minutes.',
        });
    },
});

/**
 * Moderate rate limiter for KYC verification endpoints
 * 10 requests per hour per IP
 */
export const kycRateLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many KYC verification attempts. Please try again in an hour.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger.warn('KYC rate limit exceeded', {
            ip: req.ip,
            path: req.path,
            userId: req.user?._id,
        });
        res.status(429).json({
            success: false,
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many KYC verification attempts. Please try again in an hour.',
        });
    },
});

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const generalRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please slow down.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

export default {
    authRateLimiter,
    kycRateLimiter,
    generalRateLimiter,
};
