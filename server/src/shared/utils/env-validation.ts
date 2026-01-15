/**
 * Environment Variable Validation
 * ISSUE #22: Validate critical environment variables on startup
 */

import logger from '../logger/winston.logger';

interface EnvValidationResult {
    valid: boolean;
    missing: string[];
    warnings: string[];
}

/**
 * Critical environment variables that MUST be set in production
 */
const REQUIRED_PRODUCTION_VARS = [
    'JWT_SECRET',
    'MONGODB_URI',
    'REDIS_URL',
    'DEEPVUE_CLIENT_ID',
    'DEEPVUE_API_KEY',
    'VELOCITY_WEBHOOK_SECRET',
];

/**
 * Optional but recommended environment variables
 */
const RECOMMENDED_VARS = [
    'ENCRYPTION_KEY',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
];

/**
 * Validate environment variables
 * Should be called during application startup
 */
export const validateEnvironment = (): EnvValidationResult => {
    const missing: string[] = [];
    const warnings: string[] = [];

    // Check required variables
    for (const varName of REQUIRED_PRODUCTION_VARS) {
        if (!process.env[varName]) {
            if (process.env.NODE_ENV === 'production') {
                missing.push(varName);
            } else {
                warnings.push(`${varName} not set (required in production)`);
            }
        }
    }

    // Check recommended variables
    for (const varName of RECOMMENDED_VARS) {
        if (!process.env[varName]) {
            warnings.push(`${varName} not set (recommended)`);
        }
    }

    // Validate JWT_SECRET strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        warnings.push('JWT_SECRET should be at least 32 characters long');
    }

    // Validate ENCRYPTION_KEY length
    if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length !== 32) {
        warnings.push('ENCRYPTION_KEY must be exactly 32 characters');
    }

    const valid = missing.length === 0;

    // Log results
    if (!valid) {
        logger.error('Environment validation failed:', { missing });
    }

    if (warnings.length > 0) {
        logger.warn('Environment warnings:', { warnings });
    }

    if (valid && warnings.length === 0) {
        logger.info('Environment validation passed');
    }

    return { valid, missing, warnings };
};

/**
 * Throw error if environment is invalid in production
 */
export const enforceEnvironmentValidation = (): void => {
    const result = validateEnvironment();

    if (!result.valid && process.env.NODE_ENV === 'production') {
        throw new Error(
            `Missing required environment variables: ${result.missing.join(', ')}`
        );
    }
};

export default {
    validateEnvironment,
    enforceEnvironmentValidation,
};
