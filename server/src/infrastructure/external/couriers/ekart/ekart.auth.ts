/**
 * Ekart Authentication Handler
 * 
 * Manages authentication tokens for Ekart API with:
 * - In-memory caching for performance
 * - Encrypted database storage for persistence
 * - Distributed lock to prevent concurrent refresh stampede
 * - Proactive refresh with 60s buffer before expiry
 * 
 * Token Lifecycle:
 * 1. Check in-memory cache
 * 2. If expired/missing, check DB
 * 3. If expired/missing, acquire distributed lock
 * 4. Double-check after acquiring lock (another instance may have refreshed)
 * 5. Call Ekart auth API
 * 6. Store in memory + DB
 * 7. Release lock
 * 
 * @example
 * ```typescript
 * const auth = new EkartAuth(companyId);
 * const token = await auth.getValidToken();
 * // Use token in API calls
 * ```
 */

import axios, { AxiosInstance } from 'axios';
import mongoose from 'mongoose';
import { getDistributedLock } from '../../../../shared/utils/distributed-lock.js';
import logger from '../../../../shared/logger/winston.logger.js';
import { encryptData, decryptData } from '../../../../shared/utils/encryption.js';
import { Integration } from '@/infrastructure/database/mongoose/models/index.js';
import {
    EkartAuthRequest,
    EkartAuthResponse,
    EkartError,
    EKART_ENDPOINTS,
    EKART_CONSTRAINTS,
} from './ekart.types.js';

interface CachedToken {
    token: string;
    expiresAt: Date;
}

export class EkartAuth {
    private companyId: mongoose.Types.ObjectId;
    private baseUrl: string;
    private clientId: string;
    private username: string;
    private password: string;
    private axiosInstance: AxiosInstance;

    // In-memory cache (per-instance, fast access)
    private cachedToken: CachedToken | null = null;

    // Distributed lock for multi-instance coordination
    private readonly lockKey: string;
    private readonly lockTTL = 30000; // 30 seconds
    private readonly lockWaitTime = 10000; // Wait up to 10s for lock

    constructor(
        companyId: mongoose.Types.ObjectId,
        baseUrl?: string,
        clientId?: string,
        username?: string,
        password?: string
    ) {
        this.companyId = companyId;
        this.baseUrl = baseUrl || process.env.EKART_BASE_URL || 'https://app.elite.ekartlogistics.in';
        this.clientId = clientId || process.env.EKART_CLIENT_ID || '';
        this.username = username || process.env.EKART_USERNAME || '';
        this.password = password || process.env.EKART_PASSWORD || '';

        // Lock key is company-specific to allow parallel auth for different companies
        this.lockKey = `ekart:auth:${this.companyId.toString()}`;

        this.axiosInstance = axios.create({
            baseURL: this.baseUrl,
            timeout: 15000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        logger.info('EkartAuth initialized', {
            companyId: this.companyId.toString(),
            baseUrl: this.baseUrl,
        });
    }

    /**
     * Get valid authentication token
     * 
     * Checks cache hierarchy: memory → DB → API
     * Uses distributed lock to prevent concurrent API calls
     * 
     * @returns Valid bearer token
     * @throws EkartError if authentication fails
     */
    async getValidToken(): Promise<string> {
        // 1. Check in-memory cache first (fastest)
        if (this.cachedToken && this.isTokenValid(this.cachedToken.expiresAt)) {
            logger.debug('Using cached Ekart token from memory', {
                companyId: this.companyId.toString(),
                expiresAt: this.cachedToken.expiresAt,
            });
            return this.cachedToken.token;
        }

        // 2. Check DB cache (survives app restarts)
        const storedToken = await this.getStoredToken();
        if (storedToken && this.isTokenValid(storedToken.expiresAt)) {
            logger.debug('Using cached Ekart token from DB', {
                companyId: this.companyId.toString(),
                expiresAt: storedToken.expiresAt,
            });
            // Update in-memory cache
            this.cachedToken = storedToken;
            return storedToken.token;
        }

        // 3. Token expired or missing - need to refresh
        // Use distributed lock to prevent stampede
        return await this.refreshTokenWithLock();
    }

    /**
     * Force token refresh (bypasses cache)
     * 
     * Useful for testing or when token is known to be invalid
     * 
     * @returns Fresh bearer token
     */
    async refreshToken(): Promise<string> {
        return await this.refreshTokenWithLock();
    }

    /**
     * Refresh token with distributed lock protection
     * 
     * CRITICAL: This prevents multiple app instances from calling
     * the auth API simultaneously, which could cause rate limiting
     * or token conflicts.
     * 
     * Pattern: Double-check locking
     * 1. Acquire lock
     * 2. Check cache again (another instance may have refreshed)
     * 3. If still expired, call API
     * 4. Release lock
     */
    private async refreshTokenWithLock(): Promise<string> {
        const lock = getDistributedLock();

        try {
            return await lock.withLock(
                this.lockKey,
                async () => {
                    // DOUBLE-CHECK: Another instance may have refreshed while we waited for lock
                    const storedToken = await this.getStoredToken();
                    if (storedToken && this.isTokenValid(storedToken.expiresAt)) {
                        logger.info('Token was refreshed by another instance', {
                            companyId: this.companyId.toString(),
                        });
                        this.cachedToken = storedToken;
                        return storedToken.token;
                    }

                    // Still expired - we need to refresh
                    return await this.authenticate();
                },
                this.lockTTL,
                this.lockWaitTime
            );
        } catch (error) {
            logger.error('Failed to acquire distributed lock for Ekart auth', {
                companyId: this.companyId.toString(),
                error: error instanceof Error ? error.message : 'Unknown',
            });
            // Fallback: try to authenticate anyway (risky but better than failing)
            return await this.authenticate();
        }
    }

    /**
     * Authenticate with Ekart API
     * 
     * Calls POST /integrations/v2/auth/token/{client_id}
     * Stores token in memory + DB
     * 
     * @returns Bearer token
     * @throws EkartError on authentication failure
     */
    private async authenticate(): Promise<string> {
        logger.info('Authenticating with Ekart API', {
            companyId: this.companyId.toString(),
            clientId: this.clientId,
        });

        try {
            const payload: EkartAuthRequest = {
                username: this.username,
                password: this.password,
            };

            const response = await this.axiosInstance.post<EkartAuthResponse>(
                `${EKART_ENDPOINTS.AUTH}/${this.clientId}`,
                payload
            );

            const { access_token, expires_in, token_type } = response.data;

            if (!access_token || token_type !== 'Bearer') {
                throw new Error('Invalid auth response from Ekart');
            }

            // Calculate expiry time
            const expiresAt = new Date(Date.now() + expires_in * 1000);

            // Store in memory cache
            this.cachedToken = {
                token: access_token,
                expiresAt,
            };

            // Store in DB (encrypted)
            await this.storeToken(access_token, expiresAt);

            logger.info('Ekart authentication successful', {
                companyId: this.companyId.toString(),
                expiresAt,
                expiresIn: expires_in,
            });

            return access_token;
        } catch (error: any) {
            logger.error('Ekart authentication failed', {
                companyId: this.companyId.toString(),
                error: error.response?.data || error.message,
                status: error.response?.status,
            });

            throw new EkartError(
                error.response?.status || 500,
                {
                    message: error.response?.data?.message || 'Authentication failed',
                    error: error.response?.data,
                    status_code: error.response?.status || 500,
                },
                false // Auth errors are not retryable
            );
        }
    }

    /**
     * Check if token is still valid
     * 
     * Uses 60-second buffer to proactively refresh before expiry
     * This prevents race conditions where token expires mid-request
     * 
     * @param expiresAt Token expiry timestamp
     * @returns true if token is valid (with buffer)
     */
    private isTokenValid(expiresAt: Date): boolean {
        const now = new Date();
        const bufferMs = EKART_CONSTRAINTS.TOKEN_REFRESH_BUFFER_SECONDS * 1000;
        const expiryWithBuffer = new Date(expiresAt.getTime() - bufferMs);

        return now < expiryWithBuffer;
    }

    /**
     * Get token from database
     * 
     * Retrieves encrypted token from Integration model
     * Decrypts and returns if valid
     * 
     * @returns Cached token or null
     */
    private async getStoredToken(): Promise<CachedToken | null> {
        try {
            const integration = await Integration.findOne({
                companyId: this.companyId,
                platform: 'ekart',
            }).lean();

            if (!integration?.credentials?.ekart_access_token) {
                return null;
            }

            const encryptedToken = integration.credentials.ekart_access_token;
            const expiresAt = integration.credentials.ekart_token_expires_at;

            if (!expiresAt) {
                return null;
            }

            // Decrypt token
            const token = decryptData(encryptedToken);

            return {
                token,
                expiresAt: new Date(expiresAt),
            };
        } catch (error) {
            logger.error('Error retrieving stored Ekart token', {
                companyId: this.companyId.toString(),
                error: error instanceof Error ? error.message : 'Unknown',
            });
            return null;
        }
    }

    /**
     * Store token in database (encrypted)
     * 
     * Updates Integration model with encrypted token
     * 
     * @param token Bearer token
     * @param expiresAt Expiry timestamp
     */
    private async storeToken(token: string, expiresAt: Date): Promise<void> {
        try {
            // Encrypt token before storing
            const encryptedToken = encryptData(token);

            await Integration.findOneAndUpdate(
                {
                    companyId: this.companyId,
                    platform: 'ekart',
                },
                {
                    $set: {
                        'credentials.ekart_access_token': encryptedToken,
                        'credentials.ekart_token_expires_at': expiresAt,
                    },
                },
                { upsert: true }
            );

            logger.debug('Ekart token stored in DB', {
                companyId: this.companyId.toString(),
                expiresAt,
            });
        } catch (error) {
            logger.error('Error storing Ekart token', {
                companyId: this.companyId.toString(),
                error: error instanceof Error ? error.message : 'Unknown',
            });
            // Don't throw - token is still in memory cache
        }
    }

    /**
     * Clear cached tokens (memory + DB)
     * 
     * Useful for testing or forcing re-authentication
     */
    async clearCache(): Promise<void> {
        this.cachedToken = null;

        try {
            await Integration.findOneAndUpdate(
                {
                    companyId: this.companyId,
                    platform: 'ekart',
                },
                {
                    $unset: {
                        'credentials.ekart_access_token': '',
                        'credentials.ekart_token_expires_at': '',
                    },
                }
            );

            logger.info('Ekart token cache cleared', {
                companyId: this.companyId.toString(),
            });
        } catch (error) {
            logger.error('Error clearing Ekart token cache', {
                companyId: this.companyId.toString(),
                error: error instanceof Error ? error.message : 'Unknown',
            });
        }
    }
}
