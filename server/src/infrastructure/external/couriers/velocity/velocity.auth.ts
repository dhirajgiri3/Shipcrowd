/**
 * Velocity Shipfast Authentication & Token Management
 *
 * Handles:
 * - Authentication with Velocity API
 * - Token lifecycle management (24-hour validity)
 * - Proactive token refresh (at 23 hours)
 * - Secure token storage (encrypted in database)
 *
 * @see docs/Development/Backend/Integrations/VELOCITY_SHIPFAST_INTEGRATION.md Section 2
 */

import axios, { AxiosInstance } from 'axios';
import mongoose from 'mongoose';
import Integration from '../../../database/mongoose/models/system/integrations/integration.model';
import { encryptData, decryptData } from '../../../../shared/utils/encryption';
import { VelocityAuthRequest, VelocityAuthResponse, VelocityError } from './velocity.types';
import logger from '../../../../shared/logger/winston.logger';

export class VelocityAuth {
  private baseUrl: string;
  private companyId: mongoose.Types.ObjectId;
  private httpClient: AxiosInstance;
  private tokenCache: { token: string; expiresAt: Date } | null = null;
  private authPromise: Promise<string> | null = null; // Deduplication promise

  private async findIntegrationRaw(requireActive: boolean = true) {
    const query: Record<string, unknown> = {
      companyId: this.companyId,
      type: 'courier',
      $or: [{ provider: 'velocity-shipfast' }, { provider: 'velocity' }],
    };
    if (requireActive) {
      query['settings.isActive'] = true;
    }

    return Integration.collection.findOne(query, {
      projection: { credentials: 1, settings: 1, metadata: 1 }
    });
  }

  private decodeCredentialValue(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const normalized = value.trim();
    if (!normalized) {
      return undefined;
    }

    let decoded = normalized;
    for (let i = 0; i < 2; i += 1) {
      try {
        decoded = decryptData(decoded).trim();
      } catch {
        break;
      }
    }

    // Backward compatibility for legacy plaintext rows and partially migrated data.
    return decoded || normalized;
  }

  constructor(companyId: mongoose.Types.ObjectId, baseUrl: string = 'https://shazam.velocity.in') {
    this.companyId = companyId;
    this.baseUrl = baseUrl;
    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Get credentials from Integration model
   */
  private async getCredentials(): Promise<{ username: string; password: string }> {
    const integration = await this.findIntegrationRaw(true);

    if (!integration) {
      throw new VelocityError(
        404,
        {
          message: 'Velocity Shipfast integration not found or not active',
          status_code: 404
        },
        false
      );
    }

    // Decrypt credentials
    const username = this.decodeCredentialValue((integration as any).credentials?.username) || process.env.VELOCITY_USERNAME;
    const password = this.decodeCredentialValue((integration as any).credentials?.password) || process.env.VELOCITY_PASSWORD;

    if (!username || !password) {
      throw new VelocityError(
        500,
        {
          message: 'Velocity credentials not configured',
          status_code: 500
        },
        false
      );
    }

    return { username, password };
  }

  /**
   * Authenticate with Velocity API and get new token
   */
  async authenticate(): Promise<string> {
    try {
      const credentials = await this.getCredentials();

      const request: VelocityAuthRequest = {
        username: credentials.username,
        password: credentials.password
      };

      logger.info('Authenticating with Velocity API', {
        companyId: this.companyId.toString(),
        username: credentials.username.substring(0, 4) + '***'
      });

      const response = await this.httpClient.post<VelocityAuthResponse>(
        '/custom/api/v1/auth-token',
        request
      );

      const token = response.data.token;
      // Use API expiry or fallback to 24 hours
      const expiresAt = response.data.expires_at
        ? new Date(response.data.expires_at)
        : new Date(Date.now() + 24 * 60 * 60 * 1000);

      // Store token in database (encrypted)
      await this.storeToken(token, expiresAt);

      // Cache token in memory
      this.tokenCache = { token, expiresAt };

      logger.info('Velocity authentication successful', {
        companyId: this.companyId.toString(),
        expiresAt: expiresAt.toISOString(),
        tokenPrefix: token.substring(0, 4) + '***'
      });

      return token;
    } catch (error: any) {
      if (error instanceof VelocityError) {
        throw error;
      }

      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;

        if (status === 401) {
          throw new VelocityError(
            401,
            {
              message: 'Invalid Velocity credentials',
              error: data.error || data.message,
              status_code: 401
            },
            false
          );
        }

        throw new VelocityError(
          status,
          {
            message: 'Velocity authentication failed',
            error: data.error || data.message,
            status_code: status
          },
          status >= 500
        );
      }

      throw new VelocityError(
        503,
        {
          message: 'Network error during authentication',
          error: error.message,
          status_code: 503
        },
        true
      );
    } finally {
      this.authPromise = null;
    }
  }

  /**
   * Store token in Integration model (encrypted)
   */
  private async storeToken(token: string, expiresAt: Date): Promise<void> {
    const integration = await this.findIntegrationRaw(false);

    if (!integration) {
      throw new VelocityError(
        404,
        {
          message: 'Velocity Shipfast integration not found while storing token',
          status_code: 404
        },
        false
      );
    }

    await Integration.collection.updateOne(
      {
        companyId: this.companyId,
        type: 'courier',
        $or: [{ provider: 'velocity-shipfast' }, { provider: 'velocity' }]
      },
      {
        $set: {
          'credentials.accessToken': encryptData(token),
          'metadata.tokenExpiresAt': expiresAt,
          'metadata.lastTokenRefresh': new Date(),
        }
      }
    );
  }

  /**
   * Get token from database
   */
  private async getStoredToken(): Promise<{ token: string; expiresAt: Date } | null> {
    const integration = await this.findIntegrationRaw(true);

    const encryptedToken = (integration as any)?.credentials?.accessToken;
    if (!integration || !encryptedToken) {
      return null;
    }

    const token = this.decodeCredentialValue(encryptedToken);
    const expiresAt = (integration as any).metadata?.tokenExpiresAt
      ? new Date((integration as any).metadata.tokenExpiresAt)
      : null;

    if (!token || !expiresAt) {
      return null;
    }

    return { token, expiresAt };
  }

  /**
   * Get a valid token, refreshing if necessary
   * Proactive refresh: Refresh token if it expires in less than 1 hour
   */
  async getValidToken(): Promise<string> {
    // Check memory cache first
    if (this.tokenCache && this.isTokenValid(this.tokenCache.expiresAt)) {
      return this.tokenCache.token;
    }

    // Check database
    const storedToken = await this.getStoredToken();

    if (storedToken && this.isTokenValid(storedToken.expiresAt)) {
      this.tokenCache = storedToken;
      return storedToken.token;
    }

    // Token expired or doesn't exist - authenticate
    // Use deduplication to prevent stampede
    if (this.authPromise) {
      logger.debug('Waiting for pending authentication', { companyId: this.companyId.toString() });
      return this.authPromise;
    }

    logger.info('Token expired or not found, authenticating', {
      companyId: this.companyId.toString()
    });

    this.authPromise = this.authenticate();
    return this.authPromise;
  }

  /**
   * Check if token is valid (not expired and not expiring within 1 hour)
   * Proactive refresh strategy
   */
  private isTokenValid(expiresAt: Date): boolean {
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
    return expiresAt > oneHourFromNow;
  }

  /**
   * Force token refresh (useful for testing or after 401 error)
   */
  async refreshToken(): Promise<string> {
    logger.info('Force refreshing Velocity token', {
      companyId: this.companyId.toString()
    });

    this.tokenCache = null;
    return await this.authenticate();
  }

  /**
   * Clear token cache and database token
   * Use when deactivating integration
   */
  async clearToken(): Promise<void> {
    this.tokenCache = null;

    await Integration.collection.updateOne(
      {
        companyId: this.companyId,
        type: 'courier',
        $or: [{ provider: 'velocity-shipfast' }, { provider: 'velocity' }]
      },
      {
        $unset: {
          'credentials.accessToken': '',
          'metadata.tokenExpiresAt': '',
          'metadata.lastTokenRefresh': ''
        }
      }
    );

    logger.info('Velocity token cleared', {
      companyId: this.companyId.toString()
    });
  }
}
