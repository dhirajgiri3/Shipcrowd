import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import winston from 'winston';

/**
 * ShopifyClient
 *
 * HTTP client for Shopify Admin API with built-in rate limiting,
 * retry logic, and support for both REST and GraphQL APIs.
 *
 * Features:
 * - Leaky bucket rate limiting (40 req/s burst, 2 req/s leak)
 * - Exponential backoff retry on failures
 * - Request/response logging
 * - GraphQL cost-based throttling
 * - Automatic API versioning
 */

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

interface ShopifyClientConfig {
  shopDomain: string;
  accessToken: string;
  apiVersion?: string;
  maxRetries?: number;
  logger?: winston.Logger;
}

interface GraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
    extensions?: any;
  }>;
  extensions?: {
    cost?: {
      requestedQueryCost: number;
      actualQueryCost: number;
      throttleStatus: {
        maximumAvailable: number;
        currentlyAvailable: number;
        restoreRate: number;
      };
    };
  };
}

export class ShopifyClient {
  private httpClient: AxiosInstance;
  private rateLimitBucket: RateLimitBucket;
  private shopDomain: string;
  private accessToken: string;
  private apiVersion: string;
  private maxRetries: number;
  private logger: winston.Logger;

  constructor(config: ShopifyClientConfig) {
    this.shopDomain = config.shopDomain;
    this.accessToken = config.accessToken;
    this.apiVersion = config.apiVersion || '2024-01';
    this.maxRetries = config.maxRetries || 3;

    // Setup logger
    this.logger =
      config.logger ||
      winston.createLogger({
        level: 'info',
        format: winston.format.json(),
        transports: [new winston.transports.Console()],
      });

    // Initialize rate limit bucket (leaky bucket algorithm)
    this.rateLimitBucket = {
      tokens: 40, // Start with full burst capacity
      lastRefill: Date.now(),
      maxTokens: 40, // Burst capacity
      refillRate: 2, // 2 tokens per second (steady state)
    };

    // Setup axios instance
    this.httpClient = axios.create({
      baseURL: `https://${this.shopDomain}/admin/api/${this.apiVersion}`,
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Add request interceptor for rate limiting
    this.httpClient.interceptors.request.use(
      async (config) => {
        await this.acquireToken();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for logging and rate limit tracking
    this.httpClient.interceptors.response.use(
      (response) => {
        // Track Shopify rate limit headers
        const rateLimitHeader = response.headers['x-shopify-shop-api-call-limit'];
        if (rateLimitHeader) {
          const [used, total] = rateLimitHeader.split('/').map(Number);
          this.logger.debug('Shopify rate limit', {
            used,
            total,
            remaining: total - used,
          });
        }

        return response;
      },
      (error) => {
        this.logError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Leaky bucket rate limiting
   * Allows burst of 40 requests, then leaks at 2 req/s
   */
  private async acquireToken(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRefill = (now - this.rateLimitBucket.lastRefill) / 1000;

    // Refill tokens based on time elapsed
    const tokensToAdd = timeSinceLastRefill * this.rateLimitBucket.refillRate;
    this.rateLimitBucket.tokens = Math.min(
      this.rateLimitBucket.maxTokens,
      this.rateLimitBucket.tokens + tokensToAdd
    );
    this.rateLimitBucket.lastRefill = now;

    // If no tokens available, wait until one is available
    if (this.rateLimitBucket.tokens < 1) {
      const waitTime = ((1 - this.rateLimitBucket.tokens) / this.rateLimitBucket.refillRate) * 1000;
      this.logger.debug(`Rate limit: waiting ${waitTime}ms`);
      await this.sleep(waitTime);
      this.rateLimitBucket.tokens = 1;
      this.rateLimitBucket.lastRefill = Date.now();
    }

    // Consume one token
    this.rateLimitBucket.tokens -= 1;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Exponential backoff retry logic
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const axiosError = error as AxiosError;

      // Don't retry on client errors (except 429)
      if (axiosError.response?.status && axiosError.response.status >= 400 && axiosError.response.status < 500 && axiosError.response.status !== 429) {
        throw error;
      }

      // Check if we should retry
      if (retries >= this.maxRetries) {
        this.logger.error(`Max retries (${this.maxRetries}) exceeded`);
        throw error;
      }

      // Calculate backoff delay (exponential: 1s, 2s, 4s, 8s...)
      const delay = Math.min(1000 * Math.pow(2, retries), 10000);

      // Add jitter (±20%)
      const jitter = delay * 0.2 * (Math.random() - 0.5);
      const waitTime = delay + jitter;

      this.logger.warn(`Request failed, retrying in ${Math.round(waitTime)}ms (attempt ${retries + 1}/${this.maxRetries})`, {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
      });

      await this.sleep(waitTime);

      return this.retryWithBackoff(operation, retries + 1);
    }
  }

  /**
   * Log error details
   */
  private logError(error: AxiosError): void {
    this.logger.error('Shopify API error', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });
  }

  /**
   * GET request
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.retryWithBackoff(async () => {
      this.logger.debug(`GET ${endpoint}`, { params });
      const response = await this.httpClient.get<T>(endpoint, { params });
      return response.data;
    });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.retryWithBackoff(async () => {
      this.logger.debug(`POST ${endpoint}`, { dataKeys: Object.keys(data || {}) });
      const response = await this.httpClient.post<T>(endpoint, data);
      return response.data;
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.retryWithBackoff(async () => {
      this.logger.debug(`PUT ${endpoint}`, { dataKeys: Object.keys(data || {}) });
      const response = await this.httpClient.put<T>(endpoint, data);
      return response.data;
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<T> {
    return this.retryWithBackoff(async () => {
      this.logger.debug(`DELETE ${endpoint}`);
      const response = await this.httpClient.delete<T>(endpoint);
      return response.data;
    });
  }

  /**
   * GraphQL request
   *
   * Supports cost-based throttling using Shopify's cost extensions.
   */
  async graphql<T = any>(query: string, variables?: Record<string, any>): Promise<GraphQLResponse<T>> {
    return this.retryWithBackoff(async () => {
      this.logger.debug('GraphQL query', {
        queryLength: query.length,
        variables,
      });

      const response = await this.httpClient.post<GraphQLResponse<T>>('/graphql.json', {
        query,
        variables,
      });

      const result = response.data;

      // Log GraphQL cost metrics
      if (result.extensions?.cost) {
        const cost = result.extensions.cost;
        this.logger.debug('GraphQL cost', {
          requestedQueryCost: cost.requestedQueryCost,
          actualQueryCost: cost.actualQueryCost,
          currentlyAvailable: cost.throttleStatus.currentlyAvailable,
          maximumAvailable: cost.throttleStatus.maximumAvailable,
          restoreRate: cost.throttleStatus.restoreRate,
        });

        // If cost is getting high, slow down
        const availableRatio =
          cost.throttleStatus.currentlyAvailable / cost.throttleStatus.maximumAvailable;
        if (availableRatio < 0.2) {
          // Less than 20% budget remaining
          this.logger.warn('GraphQL cost budget low, throttling requests');
          await this.sleep(1000); // Wait 1 second
        }
      }

      // Check for errors
      if (result.errors && result.errors.length > 0) {
        this.logger.error('GraphQL errors', {
          errors: result.errors,
        });
      }

      return result;
    });
  }

  /**
   * Paginate through REST API results using cursor-based pagination
   */
  async *paginate<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    limit: number = 250
  ): AsyncGenerator<T[], void, unknown> {
    let pageInfo: string | null = null;

    do {
      const requestParams: Record<string, any> = {
        ...params,
        limit,
        ...(pageInfo && { page_info: pageInfo }),
      };

      const response: any = await this.httpClient.get(endpoint, {
        params: requestParams,
      });

      const data = response.data;
      const items = Object.values(data)[0] as T[];

      yield items;

      // Extract next page info from Link header
      const linkHeader: string | undefined = response.headers['link'];
      if (linkHeader) {
        const nextMatch: RegExpMatchArray | null = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
        if (nextMatch) {
          const url: URL = new URL(nextMatch[1]);
          pageInfo = url.searchParams.get('page_info');
        } else {
          pageInfo = null;
        }
      } else {
        pageInfo = null;
      }
    } while (pageInfo);
  }

  /**
   * Test connection to Shopify
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get('/shop.json');
      this.logger.info('Shopify connection test successful');
      return true;
    } catch (error) {
      this.logger.error('Shopify connection test failed', { error });
      return false;
    }
  }

  /**
   * Get shop information
   */
  async getShopInfo(): Promise<any> {
    const response = await this.get<{ shop: any }>('/shop.json');
    return response.shop;
  }

  /**
   * Verify webhook authenticity using HMAC
   */
  static verifyWebhookHmac(body: string, hmacHeader: string, secret: string): boolean {
    const crypto = require('crypto');

    const hash = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('base64');

    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(hmacHeader, 'base64'),
      Buffer.from(hash, 'base64')
    );
  }
}

export default ShopifyClient;
