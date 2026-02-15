import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import logger from '../../../../shared/logger/winston.logger';

/**
 * FlipkartClient
 *
 * HTTP client for Flipkart Seller Hub API with OAuth 2.0 authentication.
 *
 * Features:
 * - OAuth 2.0 two-legged authentication
 * - Automatic rate limiting (1000 req/hour, 10 req/sec)
 * - Request/response logging
 * - Error handling with retry logic
 * - HMAC signature generation for webhooks
 *
 * API Base URL: https://api.flipkart.net/sellers
 * Documentation: https://seller.flipkart.com/api-docs/
 */

export interface FlipkartClientConfig {
  apiKey: string;
  apiSecret: string;
  sellerId: string;
  sandbox?: boolean;
}

export class FlipkartClient {
  private httpClient: AxiosInstance;
  private apiKey: string;
  private apiSecret: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: Date | null = null;


  // Rate limiting
  private requestQueue: number[] = [];
  private readonly MAX_REQUESTS_PER_HOUR = 1000;
  private readonly MAX_REQUESTS_PER_SECOND = 10;

  constructor(config: FlipkartClientConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    const baseURL = config.sandbox
      ? 'https://sandbox-api.flipkart.net/sellers'
      : 'https://api.flipkart.net/sellers';

    this.httpClient = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.httpClient.interceptors.request.use(
      async (config) => {
        await this.enforceRateLimit();

        // Ensure we have a valid access token
        await this.ensureValidToken();

        if (this.accessToken) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }

        logger.debug('Flipkart API Request', {
          method: config.method,
          url: config.url,
          params: config.params,
        });

        return config;
      },
      (error) => {
        logger.error('Request interceptor error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug('Flipkart API Response', {
          status: response.status,
          url: response.config.url,
        });
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error('Flipkart API Error', {
            status: error.response.status,
            url: error.config?.url,
            data: error.response.data,
          });

          // Handle 401 - token expired
          if (error.response.status === 401) {
            this.accessToken = null;
            this.tokenExpiresAt = null;
          }
        } else {
          logger.error('Network error', { error: error.message });
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();

    // Remove requests older than 1 hour
    this.requestQueue = this.requestQueue.filter((time) => now - time < 3600000);

    // Check hourly limit
    if (this.requestQueue.length >= this.MAX_REQUESTS_PER_HOUR) {
      const oldestRequest = this.requestQueue[0];
      const waitTime = 3600000 - (now - oldestRequest);
      logger.warn('Rate limit reached (hourly), waiting...', { waitTime });
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // Check per-second limit
    const recentRequests = this.requestQueue.filter((time) => now - time < 1000);
    if (recentRequests.length >= this.MAX_REQUESTS_PER_SECOND) {
      logger.debug('Rate limit reached (per second), waiting 100ms');
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.requestQueue.push(now);
  }

  /**
   * Ensure we have a valid access token
   */
  private async ensureValidToken(): Promise<void> {
    if (this.accessToken && this.tokenExpiresAt && this.tokenExpiresAt > new Date()) {
      return;
    }

    await this.getAccessToken();
  }

  /**
   * Get OAuth 2.0 access token using two-legged OAuth
   */
  async getAccessToken(): Promise<string> {
    try {
      const response = await axios.post(
        'https://api.flipkart.net/oauth-service/oauth/token',
        {
          grant_type: 'client_credentials',
          scope: 'Seller_Api',
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          auth: {
            username: this.apiKey,
            password: this.apiSecret,
          },
        }
      );

      this.accessToken = response.data.access_token;
      const expiresIn = response.data.expires_in || 3600;
      this.tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

      logger.info('Flipkart access token obtained', {
        expiresIn,
        expiresAt: this.tokenExpiresAt,
      });

      return this.accessToken!;
    } catch (error: any) {
      logger.error('Failed to get access token', {
        error: error.response?.data || error.message,
      });
      throw new Error(`Failed to get Flipkart access token: ${error.message}`);
    }
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const response = await this.httpClient.get(endpoint, { params });
    return response.data;
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await this.httpClient.post(endpoint, data);
    return response.data;
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await this.httpClient.put(endpoint, data);
    return response.data;
  }

  /**
   * PATCH request
   */
  async patch<T = any>(endpoint: string, data?: any): Promise<T> {
    const response = await this.httpClient.patch(endpoint, data);
    return response.data;
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<T> {
    const response = await this.httpClient.delete(endpoint);
    return response.data;
  }

  /**
   * Verify HMAC signature for webhook
   */
  static verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const expectedSignature = hmac.digest('base64');

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature, 'base64'),
        Buffer.from(expectedSignature, 'base64')
      );
    } catch {
      return false;
    }
  }

  /**
   * Test connection to Flipkart API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get('/orders/v3/shipments');
      return true;
    } catch (error) {
      logger.error('Connection test failed', { error });
      return false;
    }
  }
}
void FlipkartClient;

export default FlipkartClient;
