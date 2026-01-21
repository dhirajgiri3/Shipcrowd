/**
 * Feature Flags & Configuration
 *
 * Centralized feature toggles for development and production
 */

/**
 * Whether to use mock data instead of real APIs
 * Set to false in production once APIs are stable
 */
export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';

/**
 * API Base URL
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1';

/**
 * Feature Flags
 */
export const FEATURES = {
    // Financial features
    WALLET_INSIGHTS: true,
    WALLET_TRENDS: true,
    SMART_RECOMMENDATIONS: true,

    // Analytics features
    ADVANCED_ANALYTICS: true,
    AI_RECOMMENDATIONS: false, // Coming soon

    // Other features
    REAL_TIME_UPDATES: false,
} as const;
