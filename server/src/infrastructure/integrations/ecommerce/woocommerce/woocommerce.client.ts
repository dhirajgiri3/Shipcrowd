import axios, { AxiosInstance, AxiosError } from 'axios';
import winston from 'winston';

/**
 * WooCommerceClient
 *
 * HTTP client for WooCommerce REST API v3 with authentication
 * and error handling.
 *
 * Features:
 * - OAuth 1.0a authentication (consumer key/secret)
 * - Rate limiting and backoff
 * - Request/response logging
 * - Error mapping to AppError
 */

export interface WooCommerceClientConfig {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
  apiVersion?: string;
  timeout?: number;
  logger?: winston.Logger;
}

export class WooCommerceClient {
  private httpClient: AxiosInstance;
  private storeUrl: string;
  private consumerKey: string;
  private consumerSecret: string;
  private apiVersion: string;
  private logger: winston.Logger;

  constructor(config: WooCommerceClientConfig) {
    this.storeUrl = config.storeUrl.replace(/\/+$/, ''); // Remove trailing slash
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.apiVersion = config.apiVersion || 'wc/v3';

    // Setup logger
    this.logger =
      config.logger ||
      winston.createLogger({
        level: 'info',
        format: winston.format.json(),
        transports: [new winston.transports.Console()],
      });

    // Setup axios instance
    this.httpClient = axios.create({
      baseURL: `${this.storeUrl}/wp-json/${this.apiVersion}`,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'Shipcrowd/1.0',
      },
      // Basic Auth for consumer key/secret
      auth: {
        username: this.consumerKey,
        password: this.consumerSecret,
      },
    });

    // Response interceptor for logging
    this.httpClient.interceptors.response.use(
      (response) => {
        this.logger.debug('WooCommerce API response', {
          endpoint: response.config.url,
          status: response.status,
        });
        return response;
      },
      (error) => {
        this.logError(error);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Log error details
   */
  private logError(error: AxiosError): void {
    this.logger.error('WooCommerce API error', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
    });
  }

  /**
   * Retry with exponential backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    retries: number = 0,
    maxRetries: number = 3
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const axiosError = error as AxiosError;

      // Don't retry on client errors (except 429)
      if (
        axiosError.response?.status &&
        axiosError.response.status >= 400 &&
        axiosError.response.status < 500 &&
        axiosError.response.status !== 429
      ) {
        throw error;
      }

      // Check if we should retry
      if (retries >= maxRetries) {
        this.logger.error(`Max retries (${maxRetries}) exceeded`);
        throw error;
      }

      // Calculate backoff delay
      const delay = Math.min(1000 * Math.pow(2, retries), 10000);
      const jitter = delay * 0.2 * (Math.random() - 0.5);
      const waitTime = delay + jitter;

      this.logger.warn(
        `Request failed, retrying in ${Math.round(waitTime)}ms (attempt ${retries + 1}/${maxRetries})`,
        {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
        }
      );

      await this.sleep(waitTime);
      return this.retryWithBackoff(operation, retries + 1, maxRetries);
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
   * Paginate through API results
   */
  async *paginate<T = any>(
    endpoint: string,
    params?: Record<string, any>,
    perPage: number = 100
  ): AsyncGenerator<T[], void, unknown> {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const requestParams = {
        ...params,
        per_page: perPage,
        page,
      };

      const response = await this.httpClient.get(endpoint, {
        params: requestParams,
      });

      const items = response.data as T[];
      yield items;

      // Check if there are more pages
      const totalPages = parseInt(response.headers['x-wp-totalpages'] || '1');
      hasMore = page < totalPages;
      page++;
    }
  }

  /**
   * Test connection to WooCommerce store
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.get('/system_status');
      this.logger.info('WooCommerce connection test successful');
      return true;
    } catch (error) {
      this.logger.error('WooCommerce connection test failed', { error });
      return false;
    }
  }

  /**
   * Get store information
   */
  async getStoreInfo(): Promise<any> {
    const systemStatus = await this.get('/system_status');
    return {
      environment: systemStatus.environment,
      database: systemStatus.database,
      activePlugins: systemStatus.active_plugins,
      theme: systemStatus.theme,
      settings: systemStatus.settings,
    };
  }

  /**
   * Batch create/update requests
   */
  async batch<T = any>(endpoint: string, data: { create?: any[]; update?: any[]; delete?: number[] }): Promise<T> {
    return this.post(`${endpoint}/batch`, data);
  }
}

export default WooCommerceClient;
