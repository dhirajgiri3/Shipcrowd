/**
 * Request Deduplication Module
 *
 * Prevents duplicate requests from being sent to the server while a request
 * is already in flight. Uses a Map to track in-flight requests by cache key.
 */

import { AxiosRequestConfig } from 'axios';

/**
 * Type for storing pending request promises
 */
interface PendingRequest {
  promise: Promise<any>;
  requestTime: number;
  endpoint: string;
  method: string;
}

/**
 * Request Deduplicator Class
 */
export class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly REQUEST_TIMEOUT = 30000;

  /**
   * Generate a unique key for a request
   */
  private generateRequestKey(config: AxiosRequestConfig): string {
    const { url, method = 'GET', params, data } = config;
    const paramStr = params ? JSON.stringify(params) : '';
    const dataStr = data ? JSON.stringify(data) : '';
    return `${method}:${url}:${paramStr}:${dataStr}`;
  }

  /**
   * Check if a request is already in flight
   */
  isRequestPending(config: AxiosRequestConfig): boolean {
    const key = this.generateRequestKey(config);
    return this.pendingRequests.has(key);
  }

  /**
   * Register a request as in-flight
   */
  registerRequest(config: AxiosRequestConfig, promise: Promise<any>): Promise<any> {
    const key = this.generateRequestKey(config);

    if (this.pendingRequests.has(key)) {
      const existingRequest = this.pendingRequests.get(key)!;
      return existingRequest.promise;
    }

    const pendingRequest: PendingRequest = {
      promise,
      requestTime: Date.now(),
      endpoint: config.url || '',
      method: config.method || 'GET',
    };

    this.pendingRequests.set(key, pendingRequest);

    promise
      .then(() => this.deregisterRequest(key))
      .catch(() => this.deregisterRequest(key))
      .finally(() => this.deregisterRequest(key));

    setTimeout(() => {
      if (this.pendingRequests.has(key)) {
        this.deregisterRequest(key);
      }
    }, this.REQUEST_TIMEOUT);

    return promise;
  }

  /**
   * Deregister a request
   */
  private deregisterRequest(key: string): void {
    this.pendingRequests.delete(key);
  }

  /**
   * Get current number of pending requests
   */
  getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pendingRequests.clear();
  }
}

/**
 * Global instance
 */
export const requestDeduplicator = new RequestDeduplicator();

/**
 * Axios interceptor for request deduplication
 */
export const deduplicationInterceptor = (config: AxiosRequestConfig) => {
  if (config.method?.toUpperCase() === 'GET') {
    if (requestDeduplicator.isRequestPending(config)) {
      (config as any).deduplicated = true;
    }
  }
  return config;
};

/**
 * Deduplication metrics for debugging
 */
export class DeduplicationMetrics {
  private deduplicatedRequests = 0;
  private totalRequests = 0;

  recordRequest(isDeduplicated: boolean): void {
    this.totalRequests++;
    if (isDeduplicated) {
      this.deduplicatedRequests++;
    }
  }

  getMetrics() {
    return {
      totalRequests: this.totalRequests,
      deduplicatedRequests: this.deduplicatedRequests,
      deduplicationRate: this.totalRequests > 0
        ? ((this.deduplicatedRequests / this.totalRequests) * 100).toFixed(2) + '%'
        : '0%',
    };
  }

  reset(): void {
    this.deduplicatedRequests = 0;
    this.totalRequests = 0;
  }
}

export const deduplicationMetrics = new DeduplicationMetrics();

export default {
  requestDeduplicator,
  deduplicationInterceptor,
  deduplicationMetrics,
};
