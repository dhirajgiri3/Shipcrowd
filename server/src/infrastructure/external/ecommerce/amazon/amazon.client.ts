import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import crypto from 'crypto';
import logger from '../../../../shared/logger/winston.logger';

/**
 * AmazonClient
 *
 * HTTP client for Amazon SP-API with AWS Signature Version 4 and LWA OAuth.
 *
 * Features:
 * - LWA (Login with Amazon) OAuth token management with auto-refresh
 * - AWS Signature Version 4 request signing
 * - Dynamic token bucket rate limiting
 * - Support for multiple marketplaces (NA, EU, FE)
 * - NextToken pagination
 * - Feed submission and processing
 * - Automatic retry with exponential backoff
 */

interface LWAToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

interface LWATokenCache {
  accessToken: string;
  expiresAt: number;
}

interface RateLimitBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

interface AmazonClientConfig {
  // LWA OAuth credentials
  clientId: string;
  clientSecret: string;
  refreshToken: string;

  // AWS credentials for Signature V4
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string; // e.g., 'us-east-1'

  // Marketplace configuration
  marketplace?: 'NA' | 'EU' | 'FE'; // North America, Europe, Far East
  endpoint?: string; // Override default endpoint

  // Optional configuration
  maxRetries?: number;
}

interface FeedSubmissionResponse {
  feedDocumentId: string;
  feedId: string;
}

interface FeedResult {
  feedId: string;
  processingStatus: 'CANCELLED' | 'DONE' | 'FATAL' | 'IN_PROGRESS' | 'IN_QUEUE';
  resultFeedDocumentId?: string;
}

export class AmazonClient {
  private httpClient: AxiosInstance;
  private rateLimitBucket: RateLimitBucket;
  private lwaTokenCache: LWATokenCache | null = null;

  // LWA OAuth config
  private clientId: string;
  private clientSecret: string;
  private refreshToken: string;

  // AWS Signature V4 config
  private awsAccessKeyId: string;
  private awsSecretAccessKey: string;
  private awsRegion: string;

  // Client configuration
  private baseURL: string;
  private maxRetries: number;


  // Marketplace endpoints
  private static readonly MARKETPLACE_ENDPOINTS = {
    NA: 'https://sellingpartnerapi-na.amazon.com', // North America
    EU: 'https://sellingpartnerapi-eu.amazon.com', // Europe
    FE: 'https://sellingpartnerapi-fe.amazon.com', // Far East
  };

  // LWA OAuth endpoint
  private static readonly LWA_TOKEN_ENDPOINT = 'https://api.amazon.com/auth/o2/token';

  constructor(config: AmazonClientConfig) {
    // LWA OAuth setup
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.refreshToken = config.refreshToken;

    // AWS Signature V4 setup
    this.awsAccessKeyId = config.awsAccessKeyId;
    this.awsSecretAccessKey = config.awsSecretAccessKey;
    this.awsRegion = config.awsRegion;

    // Determine base URL
    const marketplace = config.marketplace || 'NA';
    this.baseURL = config.endpoint || AmazonClient.MARKETPLACE_ENDPOINTS[marketplace];

    this.maxRetries = config.maxRetries || 3;

    // Logger is already imported from shared logger module

    // Initialize rate limit bucket (dynamic, will adjust based on response headers)
    this.rateLimitBucket = {
      tokens: 10, // Conservative start
      lastRefill: Date.now(),
      maxTokens: 10,
      refillRate: 2, // 2 tokens per second (default, will adjust)
    };

    // Setup axios instance
    this.httpClient = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 second timeout
    });

    // Add request interceptor for authentication and rate limiting
    this.httpClient.interceptors.request.use(
      async (config) => {
        await this.acquireToken();
        await this.addAuthHeaders(config);
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for rate limit tracking
    this.httpClient.interceptors.response.use(
      (response) => {
        this.updateRateLimitFromHeaders(response.headers);
        return response;
      },
      (error) => {
        if (error.response) {
          this.updateRateLimitFromHeaders(error.response.headers);
        }
        this.logError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get LWA access token (with auto-refresh)
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();

    // Return cached token if still valid (with 5-minute buffer)
    if (this.lwaTokenCache && this.lwaTokenCache.expiresAt > now + 300000) {
      return this.lwaTokenCache.accessToken;
    }

    logger.debug('Refreshing LWA access token');

    try {
      const response = await axios.post<LWAToken>(
        AmazonClient.LWA_TOKEN_ENDPOINT,
        {
          grant_type: 'refresh_token',
          refresh_token: this.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      const token = response.data;

      // Cache the token
      this.lwaTokenCache = {
        accessToken: token.access_token,
        expiresAt: now + token.expires_in * 1000,
      };

      logger.info('LWA access token refreshed successfully', {
        expiresIn: token.expires_in,
      });

      return token.access_token;
    } catch (error) {
      logger.error('Failed to refresh LWA access token', { error });
      throw new Error('Failed to obtain LWA access token');
    }
  }

  /**
   * Add authentication headers (LWA token + AWS Signature V4)
   */
  private async addAuthHeaders(config: AxiosRequestConfig): Promise<void> {
    // Get LWA access token
    const accessToken = await this.getAccessToken();

    // Add LWA access token header
    if (!config.headers) {
      config.headers = {};
    }
    config.headers['x-amz-access-token'] = accessToken;
    config.headers['Content-Type'] = config.headers['Content-Type'] || 'application/json';

    // Generate AWS Signature V4
    const signature = this.generateSignatureV4(config);

    // Add AWS signature headers
    config.headers['Authorization'] = signature.authorization;
    config.headers['x-amz-date'] = signature.timestamp;

    // Add security token if present
    if (signature.securityToken) {
      config.headers['x-amz-security-token'] = signature.securityToken;
    }
  }

  /**
   * Generate AWS Signature Version 4
   */
  private generateSignatureV4(config: AxiosRequestConfig): {
    authorization: string;
    timestamp: string;
    securityToken?: string;
  } {
    const method = (config.method || 'GET').toUpperCase();
    const url = new URL(config.url || '', this.baseURL);
    const path = url.pathname;
    const query = url.search.slice(1); // Remove leading '?'

    // Create timestamp
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = timestamp.slice(0, 8);

    // Canonical headers
    const canonicalHeaders = [
      `host:${url.hostname}`,
      `x-amz-date:${timestamp}`,
    ].join('\n');

    const signedHeaders = 'host;x-amz-date';

    // Payload hash
    const payload = config.data ? JSON.stringify(config.data) : '';
    const payloadHash = crypto
      .createHash('sha256')
      .update(payload)
      .digest('hex');

    // Canonical request
    const canonicalRequest = [
      method,
      path,
      query,
      canonicalHeaders,
      '',
      signedHeaders,
      payloadHash,
    ].join('\n');

    // String to sign
    const algorithm = 'AWS4-HMAC-SHA256';
    const service = 'execute-api';
    const credentialScope = `${dateStamp}/${this.awsRegion}/${service}/aws4_request`;

    const canonicalRequestHash = crypto
      .createHash('sha256')
      .update(canonicalRequest)
      .digest('hex');

    const stringToSign = [
      algorithm,
      timestamp,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    // Calculate signature
    const kDate = crypto
      .createHmac('sha256', `AWS4${this.awsSecretAccessKey}`)
      .update(dateStamp)
      .digest();

    const kRegion = crypto
      .createHmac('sha256', kDate)
      .update(this.awsRegion)
      .digest();

    const kService = crypto
      .createHmac('sha256', kRegion)
      .update(service)
      .digest();

    const kSigning = crypto
      .createHmac('sha256', kService)
      .update('aws4_request')
      .digest();

    const signature = crypto
      .createHmac('sha256', kSigning)
      .update(stringToSign)
      .digest('hex');

    // Build authorization header
    const authorization = `${algorithm} Credential=${this.awsAccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      authorization,
      timestamp,
    };
  }

  /**
   * Dynamic token bucket rate limiting
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

    // If no tokens available, wait
    if (this.rateLimitBucket.tokens < 1) {
      const waitTime = ((1 - this.rateLimitBucket.tokens) / this.rateLimitBucket.refillRate) * 1000;
      logger.debug(`Rate limit: waiting ${Math.round(waitTime)}ms`);
      await this.sleep(waitTime);
      this.rateLimitBucket.tokens = 1;
      this.rateLimitBucket.lastRefill = Date.now();
    }

    // Consume one token
    this.rateLimitBucket.tokens -= 1;
  }

  /**
   * Update rate limit parameters from response headers
   */
  private updateRateLimitFromHeaders(headers: any): void {
    const rateLimit = headers['x-amzn-ratelimit-limit'];

    if (rateLimit) {
      const limit = parseFloat(rateLimit);
      if (!isNaN(limit)) {
        // Update refill rate (Amazon provides requests per second)
        this.rateLimitBucket.refillRate = limit;

        // Set max tokens to allow burst (2x the rate)
        this.rateLimitBucket.maxTokens = Math.max(limit * 2, 10);

        logger.debug('Updated rate limit', {
          refillRate: this.rateLimitBucket.refillRate,
          maxTokens: this.rateLimitBucket.maxTokens,
        });
      }
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Exponential backoff retry logic with 429 handling
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const axiosError = error as AxiosError;

      // Handle 429 Too Many Requests
      if (axiosError.response?.status === 429) {
        const retryAfter = axiosError.response.headers['retry-after'];
        const waitTime = retryAfter ? parseInt(retryAfter, 10) * 1000 : 5000;

        logger.warn(`Rate limited (429), retrying after ${waitTime}ms`);
        await this.sleep(waitTime);

        // Reset rate limit bucket to prevent immediate retry
        this.rateLimitBucket.tokens = 0;
        this.rateLimitBucket.lastRefill = Date.now();

        return this.retryWithBackoff(operation, retries);
      }

      // Don't retry on client errors (except 429)
      if (
        axiosError.response?.status &&
        axiosError.response.status >= 400 &&
        axiosError.response.status < 500
      ) {
        throw error;
      }

      // Check if we should retry
      if (retries >= this.maxRetries) {
        logger.error(`Max retries (${this.maxRetries}) exceeded`);
        throw error;
      }

      // Calculate backoff delay (exponential: 1s, 2s, 4s, 8s...)
      const delay = Math.min(1000 * Math.pow(2, retries), 10000);

      // Add jitter (±20%)
      const jitter = delay * 0.2 * (Math.random() - 0.5);
      const waitTime = delay + jitter;

      logger.warn(
        `Request failed, retrying in ${Math.round(waitTime)}ms (attempt ${retries + 1}/${this.maxRetries})`,
        {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
        }
      );

      await this.sleep(waitTime);

      return this.retryWithBackoff(operation, retries + 1);
    }
  }

  /**
   * Log error details
   */
  private logError(error: AxiosError): void {
    logger.error('Amazon SP-API error', {
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
      logger.debug(`GET ${endpoint}`, { params });
      const response = await this.httpClient.get<T>(endpoint, { params });
      return response.data;
    });
  }

  /**
   * POST request
   */
  async post<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.retryWithBackoff(async () => {
      logger.debug(`POST ${endpoint}`, { dataKeys: data ? Object.keys(data) : [] });
      const response = await this.httpClient.post<T>(endpoint, data);
      return response.data;
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(endpoint: string, data?: any): Promise<T> {
    return this.retryWithBackoff(async () => {
      logger.debug(`PUT ${endpoint}`, { dataKeys: data ? Object.keys(data) : [] });
      const response = await this.httpClient.put<T>(endpoint, data);
      return response.data;
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(endpoint: string): Promise<T> {
    return this.retryWithBackoff(async () => {
      logger.debug(`DELETE ${endpoint}`);
      const response = await this.httpClient.delete<T>(endpoint);
      return response.data;
    });
  }

  /**
   * Submit feed (for inventory updates, price changes, etc.)
   *
   * @param feedType - Type of feed (e.g., 'POST_PRODUCT_DATA', 'POST_INVENTORY_AVAILABILITY_DATA')
   * @param content - Feed content (XML or JSON depending on feed type)
   * @param contentType - MIME type of content (default: 'text/xml; charset=UTF-8')
   */
  async submitFeed(
    feedType: string,
    content: string,
    contentType: string = 'text/xml; charset=UTF-8'
  ): Promise<FeedSubmissionResponse> {
    logger.info('Submitting feed', { feedType, contentLength: content.length });

    // Step 1: Create feed document
    const createDocResponse = await this.post<{ feedDocumentId: string }>(
      '/feeds/2021-06-30/documents',
      {
        contentType,
      }
    );

    const feedDocumentId = createDocResponse.feedDocumentId;

    // Step 2: Upload content to feed document
    // Note: The actual upload URL is typically returned in the createDocResponse
    // and requires a separate HTTP PUT to S3. For simplicity, this is a placeholder.
    // In production, you would:
    // 1. Get the uploadUrl from createDocResponse
    // 2. PUT the content to that URL
    // 3. Then create the feed

    // Step 3: Create feed
    const createFeedResponse = await this.post<{ feedId: string }>(
      '/feeds/2021-06-30/feeds',
      {
        feedType,
        marketplaceIds: [], // Should be provided based on marketplace
        inputFeedDocumentId: feedDocumentId,
      }
    );

    logger.info('Feed submitted successfully', {
      feedId: createFeedResponse.feedId,
      feedDocumentId,
    });

    return {
      feedId: createFeedResponse.feedId,
      feedDocumentId,
    };
  }

  /**
   * Get feed processing result
   *
   * @param feedId - Feed ID from submitFeed
   */
  async getFeedResult(feedId: string): Promise<FeedResult> {
    logger.debug('Getting feed result', { feedId });

    const response = await this.get<FeedResult>(`/feeds/2021-06-30/feeds/${feedId}`);

    logger.info('Feed result retrieved', {
      feedId,
      processingStatus: response.processingStatus,
    });

    return response;
  }

  /**
   * Poll feed until processing is complete
   *
   * @param feedId - Feed ID from submitFeed
   * @param maxAttempts - Maximum polling attempts (default: 30)
   * @param intervalMs - Polling interval in milliseconds (default: 10000)
   */
  async pollFeedUntilComplete(
    feedId: string,
    maxAttempts: number = 30,
    intervalMs: number = 10000
  ): Promise<FeedResult> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.getFeedResult(feedId);

      if (result.processingStatus === 'DONE' || result.processingStatus === 'FATAL') {
        return result;
      }

      if (result.processingStatus === 'CANCELLED') {
        throw new Error(`Feed ${feedId} was cancelled`);
      }

      logger.debug(`Feed still processing (${result.processingStatus}), waiting...`, {
        attempt: attempt + 1,
        maxAttempts,
      });

      await this.sleep(intervalMs);
    }

    throw new Error(`Feed ${feedId} did not complete within ${maxAttempts} attempts`);
  }

  /**
   * Paginate through results using NextToken
   *
   * @param endpoint - API endpoint
   * @param params - Query parameters
   */
  async *paginate<T = any>(
    endpoint: string,
    params?: Record<string, any>
  ): AsyncGenerator<T, void, unknown> {
    let nextToken: string | null = null;

    do {
      const requestParams: Record<string, any> = {
        ...params,
        ...(nextToken && { NextToken: nextToken }),
      };

      const response: any = await this.get(endpoint, requestParams);

      // Yield current page data
      yield response;

      // Extract NextToken for pagination
      nextToken = response.NextToken || response.nextToken || null;

      logger.debug('Pagination status', {
        hasNextToken: !!nextToken,
        endpoint,
      });
    } while (nextToken);
  }

  /**
   * Test connection to Amazon SP-API
   *
   * Uses the orders endpoint as a lightweight test
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test with a minimal orders query
      await this.get('/orders/v0/orders', {
        MarketplaceIds: 'ATVPDKIKX0DER', // US marketplace
        CreatedAfter: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
      });

      logger.info('Amazon SP-API connection test successful');
      return true;
    } catch (error) {
      logger.error('Amazon SP-API connection test failed', { error });
      return false;
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<any> {
    return this.get(`/orders/v0/orders/${orderId}`);
  }

  /**
   * List orders with filters
   */
  async listOrders(params: {
    marketplaceIds: string[];
    createdAfter?: string;
    createdBefore?: string;
    lastUpdatedAfter?: string;
    orderStatuses?: string[];
    fulfillmentChannels?: string[];
    maxResultsPerPage?: number;
  }): Promise<any> {
    return this.get('/orders/v0/orders', {
      MarketplaceIds: params.marketplaceIds.join(','),
      ...(params.createdAfter && { CreatedAfter: params.createdAfter }),
      ...(params.createdBefore && { CreatedBefore: params.createdBefore }),
      ...(params.lastUpdatedAfter && { LastUpdatedAfter: params.lastUpdatedAfter }),
      ...(params.orderStatuses && { OrderStatuses: params.orderStatuses.join(',') }),
      ...(params.fulfillmentChannels && { FulfillmentChannels: params.fulfillmentChannels.join(',') }),
      ...(params.maxResultsPerPage && { MaxResultsPerPage: params.maxResultsPerPage }),
    });
  }

  /**
   * Get order items
   */
  async getOrderItems(orderId: string): Promise<any> {
    return this.get(`/orders/v0/orders/${orderId}/orderItems`);
  }

  /**
   * Update inventory quantity (via feed submission)
   *
   * This is a helper method that constructs and submits an inventory feed
   */
  async updateInventory(updates: Array<{ sku: string; quantity: number }>): Promise<string> {
    // Construct XML feed for inventory update
    const xmlContent = this.buildInventoryFeedXML(updates);

    const result = await this.submitFeed(
      'POST_INVENTORY_AVAILABILITY_DATA',
      xmlContent
    );

    return result.feedId;
  }

  /**
   * Build inventory feed XML
   */
  private buildInventoryFeedXML(updates: Array<{ sku: string; quantity: number }>): string {
    const messages = updates
      .map(
        (update, index) => `
      <Message>
        <MessageID>${index + 1}</MessageID>
        <OperationType>Update</OperationType>
        <Inventory>
          <SKU>${update.sku}</SKU>
          <Quantity>${update.quantity}</Quantity>
        </Inventory>
      </Message>`
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<AmazonEnvelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="amzn-envelope.xsd">
  <Header>
    <DocumentVersion>1.01</DocumentVersion>
    <MerchantIdentifier>MERCHANT_ID</MerchantIdentifier>
  </Header>
  <MessageType>Inventory</MessageType>
  <PurgeAndReplace>false</PurgeAndReplace>${messages}
</AmazonEnvelope>`;
  }
}

export default AmazonClient;
