import { Request, Response, NextFunction } from 'express';
import { rateLimit, Options } from 'express-rate-limit';
import logger from '../../../../shared/logger/winston.logger';

// Default options for rate limiters
const defaultOptions: Partial<Options> = {
  standardHeaders: 'draft-7', // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { message: 'Too many requests, please try again later' },
  skip: (req: Request) => process.env.NODE_ENV === 'test', // Skip rate limiting in test environment
};

/**
 * Rate limiter for login attempts
 * More restrictive to prevent brute force attacks
 */
export const loginRateLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5, // 5 requests per windowMs

  message: { message: 'Too many login attempts, please try again later' },
});

/**
 * Rate limiter for password reset requests
 * Restrictive to prevent abuse
 */
export const passwordResetRateLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 3, // 3 requests per hour

  message: { message: 'Too many password reset requests, please try again later' },
});

/**
 * Rate limiter for registration
 * Moderately restrictive to prevent spam
 */
export const registrationRateLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5, // 5 requests per hour

  message: { message: 'Too many registration attempts, please try again later' },
});

/**
 * Rate limiter for email verification
 * Moderately restrictive to prevent abuse
 */
export const emailVerificationRateLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 10, // 10 requests per hour

  message: { message: 'Too many verification attempts, please try again later' },
});

/**
 * Rate limiter for API endpoints
 * Less restrictive for normal API usage
 */
export const apiRateLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // 100 requests per 15 minutes

});

/**
 * Rate limiter for public endpoints
 * More permissive for public access
 */
export const publicRateLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // 200 requests per 15 minutes

});

/**
 * IP-based rate limiter for all requests
 * Very permissive, just to prevent DoS attacks
 */
export const globalRateLimiter = rateLimit({
  ...defaultOptions,
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 500, // 500 requests per 5 minutes

});

export default {
  loginRateLimiter,
  passwordResetRateLimiter,
  registrationRateLimiter,
  emailVerificationRateLimiter,
  apiRateLimiter,
  publicRateLimiter,
  globalRateLimiter,
};
