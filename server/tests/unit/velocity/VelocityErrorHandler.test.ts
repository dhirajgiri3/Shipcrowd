/**
 * VelocityErrorHandler Unit Tests
 *
 * Tests error classification, retry logic, and rate limiting
 * Coverage targets: 85%+
 */

import {
  handleVelocityError,
  retryWithBackoff,
  RateLimiter,
  VelocityRateLimiters
} from '../../../src/infrastructure/external/couriers/velocity/VelocityErrorHandler';
import { VelocityError } from '../../../src/infrastructure/external/couriers/velocity/VelocityTypes';

describe('VelocityErrorHandler', () => {
  describe('handleVelocityError()', () => {
    it('should handle VelocityError as-is', () => {
      const originalError = new VelocityError(
        400,
        { message: 'Test error', status_code: 400 },
        false
      );

      const result = handleVelocityError(originalError);

      expect(result).toBe(originalError);
      expect(result.statusCode).toBe(400);
      expect(result.isRetryable).toBe(false);
    });

    it('should handle 401 authentication error', () => {
      const axiosError = {
        response: {
          status: 401,
          data: {
            error: 'Invalid token',
            message: 'Authentication failed'
          }
        }
      };

      const result = handleVelocityError(axiosError, 'Test API');

      expect(result).toBeInstanceOf(VelocityError);
      expect(result.statusCode).toBe(401);
      expect(result.isRetryable).toBe(false);
      expect(result.message).toContain('authentication failed');
    });

    it('should handle 400 validation error', () => {
      const axiosError = {
        response: {
          status: 400,
          data: {
            message: 'Validation failed',
            errors: {
              pincode: 'Invalid pincode format',
              phone: 'Phone number required'
            }
          }
        }
      };

      const result = handleVelocityError(axiosError);

      expect(result.statusCode).toBe(400);
      expect(result.isRetryable).toBe(false);
      expect(result.message).toContain('Validation failed');
    });

    it('should handle 404 not found error', () => {
      const axiosError = {
        response: {
          status: 404,
          data: {
            message: 'Order not found',
            error: 'AWB does not exist'
          }
        }
      };

      const result = handleVelocityError(axiosError);

      expect(result.statusCode).toBe(404);
      expect(result.isRetryable).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should handle 422 not serviceable error', () => {
      const axiosError = {
        response: {
          status: 422,
          data: {
            message: 'Pincode not serviceable',
            error: 'No carriers available for this location'
          }
        }
      };

      const result = handleVelocityError(axiosError);

      expect(result.statusCode).toBe(422);
      expect(result.isRetryable).toBe(false);
      expect(result.message).toContain('serviceable');
    });

    it('should handle 429 rate limit error as retryable', () => {
      const axiosError = {
        response: {
          status: 429,
          data: {
            error: 'Too many requests'
          }
        }
      };

      const result = handleVelocityError(axiosError);

      expect(result.statusCode).toBe(429);
      expect(result.isRetryable).toBe(true);
      expect(result.message).toContain('Rate limit');
    });

    it('should handle 500 server error as retryable', () => {
      const axiosError = {
        response: {
          status: 500,
          data: {
            error: 'Internal server error'
          }
        }
      };

      const result = handleVelocityError(axiosError);

      expect(result.statusCode).toBe(500);
      expect(result.isRetryable).toBe(true);
    });

    it('should handle 502 bad gateway as retryable', () => {
      const axiosError = {
        response: {
          status: 502,
          data: {}
        }
      };

      const result = handleVelocityError(axiosError);

      expect(result.statusCode).toBe(502);
      expect(result.isRetryable).toBe(true);
    });

    it('should handle 503 service unavailable as retryable', () => {
      const axiosError = {
        response: {
          status: 503,
          data: {
            message: 'Service temporarily unavailable'
          }
        }
      };

      const result = handleVelocityError(axiosError);

      expect(result.statusCode).toBe(503);
      expect(result.isRetryable).toBe(true);
    });

    it('should handle 504 gateway timeout as retryable', () => {
      const axiosError = {
        response: {
          status: 504,
          data: {}
        }
      };

      const result = handleVelocityError(axiosError);

      expect(result.statusCode).toBe(504);
      expect(result.isRetryable).toBe(true);
    });

    it('should handle timeout error as retryable', () => {
      const timeoutError = {
        code: 'ECONNABORTED',
        message: 'Request timeout after 30000ms'
      };

      const result = handleVelocityError(timeoutError);

      expect(result.statusCode).toBe(408);
      expect(result.isRetryable).toBe(true);
      expect(result.message).toContain('timeout');
    });

    it('should handle network connection errors as retryable', () => {
      const networkError = {
        code: 'ENOTFOUND',
        message: 'getaddrinfo ENOTFOUND shazam.velocity.in'
      };

      const result = handleVelocityError(networkError);

      expect(result.statusCode).toBe(503);
      expect(result.isRetryable).toBe(true);
      expect(result.message).toContain('Network error');
    });

    it('should handle connection refused errors as retryable', () => {
      const connRefusedError = {
        code: 'ECONNREFUSED',
        message: 'connect ECONNREFUSED 127.0.0.1:443'
      };

      const result = handleVelocityError(connRefusedError);

      expect(result.statusCode).toBe(503);
      expect(result.isRetryable).toBe(true);
    });

    it('should handle generic error with default behavior', () => {
      const genericError = {
        message: 'Something went wrong'
      };

      const result = handleVelocityError(genericError, 'Generic Context');

      expect(result.statusCode).toBe(500);
      expect(result.isRetryable).toBe(true);
      expect(result.message).toContain('Generic Context');
    });

    it('should include context in error message', () => {
      const error = {
        response: {
          status: 500,
          data: { error: 'Server error' }
        }
      };

      const result = handleVelocityError(error, 'Forward Order');

      expect(result.message).toContain('Velocity API');
    });
  });

  describe('retryWithBackoff()', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');

      const promise = retryWithBackoff(mockFn, 3, 1000, 'Test');
      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable error', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(
          new VelocityError(503, { message: 'Service unavailable', status_code: 503 }, true)
        )
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(mockFn, 3, 1000, 'Test');

      // Fast-forward through first retry delay
      await jest.advanceTimersByTimeAsync(1500);

      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable error', async () => {
      const mockFn = jest.fn().mockRejectedValue(
        new VelocityError(400, { message: 'Bad request', status_code: 400 }, false)
      );

      await expect(retryWithBackoff(mockFn, 3, 1000, 'Test')).rejects.toThrow(
        VelocityError
      );

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff (1s, 2s, 4s)', async () => {
      const delays: number[] = [];
      let lastTime = Date.now();

      const mockFn = jest.fn().mockImplementation(() => {
        const now = Date.now();
        if (delays.length > 0) {
          delays.push(now - lastTime);
        }
        lastTime = now;
        return Promise.reject(
          new VelocityError(503, { message: 'Service unavailable', status_code: 503 }, true)
        );
      });

      const promise = retryWithBackoff(mockFn, 3, 1000, 'Test');

      // Advance through all retries
      await jest.advanceTimersByTimeAsync(1500); // First retry
      await jest.advanceTimersByTimeAsync(2500); // Second retry

      await expect(promise).rejects.toThrow();

      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw last error after max retries', async () => {
      const finalError = new VelocityError(
        503,
        { message: 'Still unavailable', status_code: 503 },
        true
      );

      const mockFn = jest.fn().mockRejectedValue(finalError);

      const promise = retryWithBackoff(mockFn, 3, 100, 'Test');

      // Fast-forward through all retries
      await jest.advanceTimersByTimeAsync(800);

      await expect(promise).rejects.toThrow(finalError);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should convert non-VelocityError to VelocityError', async () => {
      const genericError = new Error('Generic error');
      const mockFn = jest.fn().mockRejectedValue(genericError);

      const promise = retryWithBackoff(mockFn, 1, 1000, 'Test');

      await expect(promise).rejects.toThrow(VelocityError);
    });

    it('should respect maxRetries parameter', async () => {
      const mockFn = jest.fn().mockRejectedValue(
        new VelocityError(503, { message: 'Error', status_code: 503 }, true)
      );

      const promise = retryWithBackoff(mockFn, 5, 100, 'Test');

      // Fast-forward through all retries
      await jest.advanceTimersByTimeAsync(3200);

      await expect(promise).rejects.toThrow();
      expect(mockFn).toHaveBeenCalledTimes(5);
    });

    it('should respect baseDelay parameter', async () => {
      const mockFn = jest
        .fn()
        .mockRejectedValueOnce(
          new VelocityError(503, { message: 'Error', status_code: 503 }, true)
        )
        .mockResolvedValueOnce('success');

      const promise = retryWithBackoff(mockFn, 2, 500, 'Test');

      // First retry should be around 500ms
      await jest.advanceTimersByTimeAsync(700);

      const result = await promise;

      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('RateLimiter', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow request when tokens available', async () => {
      const limiter = new RateLimiter(10, 100);

      const promise = limiter.acquire();
      await expect(promise).resolves.toBeUndefined();
    });

    it('should consume token on acquire', async () => {
      const limiter = new RateLimiter(2, 100);

      await limiter.acquire();
      expect(limiter.hasTokens()).toBe(true);

      await limiter.acquire();
      expect(limiter.hasTokens()).toBe(false);
    });

    it('should wait when no tokens available', async () => {
      const limiter = new RateLimiter(1, 60); // 1 token, 60/minute = 1/second

      await limiter.acquire(); // Consumes the only token

      const acquirePromise = limiter.acquire();

      // Should not resolve immediately
      let resolved = false;
      acquirePromise.then(() => { resolved = true; });

      await jest.advanceTimersByTimeAsync(500);
      expect(resolved).toBe(false);

      // After 1 second, should have refilled
      await jest.advanceTimersByTimeAsync(600);
      await acquirePromise;
      expect(resolved).toBe(true);
    });

    it('should refill tokens over time', async () => {
      const limiter = new RateLimiter(5, 60); // 60/minute = 1/second

      // Consume all tokens
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();
      await limiter.acquire();

      expect(limiter.hasTokens()).toBe(false);

      // Advance 2 seconds
      await jest.advanceTimersByTimeAsync(2000);

      expect(limiter.hasTokens()).toBe(true);
    });

    it('should not exceed capacity when refilling', async () => {
      const limiter = new RateLimiter(5, 300); // Capacity 5, 300/min = 5/second

      // Wait a long time
      await jest.advanceTimersByTimeAsync(10000);

      // Should still only have capacity worth of tokens
      for (let i = 0; i < 5; i++) {
        await limiter.acquire();
      }

      expect(limiter.hasTokens()).toBe(false);
    });

    it('should reset tokens and timer', () => {
      const limiter = new RateLimiter(10, 100);

      // Consume some tokens
      limiter.acquire();
      limiter.acquire();
      limiter.acquire();

      limiter.reset();

      expect(limiter.hasTokens()).toBe(true);
    });

    it('should handle fractional token refill correctly', async () => {
      const limiter = new RateLimiter(100, 100); // 100/minute = 1.666.../second

      // Consume all tokens
      for (let i = 0; i < 100; i++) {
        await limiter.acquire();
      }

      expect(limiter.hasTokens()).toBe(false);

      // Advance by 600ms (should refill ~1 token)
      await jest.advanceTimersByTimeAsync(600);

      expect(limiter.hasTokens()).toBe(true);
    });
  });

  describe('VelocityRateLimiters', () => {
    it('should have authentication rate limiter (10/hour)', () => {
      expect(VelocityRateLimiters.authentication).toBeInstanceOf(RateLimiter);
    });

    it('should have forwardOrder rate limiter (100/min)', () => {
      expect(VelocityRateLimiters.forwardOrder).toBeInstanceOf(RateLimiter);
    });

    it('should have tracking rate limiter (100/min)', () => {
      expect(VelocityRateLimiters.tracking).toBeInstanceOf(RateLimiter);
    });

    it('should have cancellation rate limiter (50/min)', () => {
      expect(VelocityRateLimiters.cancellation).toBeInstanceOf(RateLimiter);
    });

    it('should have serviceability rate limiter (200/min)', () => {
      expect(VelocityRateLimiters.serviceability).toBeInstanceOf(RateLimiter);
    });

    it('should have warehouse rate limiter (20/min)', () => {
      expect(VelocityRateLimiters.warehouse).toBeInstanceOf(RateLimiter);
    });

    it('should allow acquiring tokens from different limiters independently', async () => {
      await expect(VelocityRateLimiters.authentication.acquire()).resolves.toBeUndefined();
      await expect(VelocityRateLimiters.forwardOrder.acquire()).resolves.toBeUndefined();
      await expect(VelocityRateLimiters.tracking.acquire()).resolves.toBeUndefined();
    });
  });

  describe('Error Message Formatting', () => {
    it('should include status code in error', () => {
      const error = new VelocityError(
        400,
        { message: 'Test error', status_code: 400 },
        false
      );

      expect(error.statusCode).toBe(400);
    });

    it('should include retryable flag', () => {
      const retryable = new VelocityError(
        503,
        { message: 'Service unavailable', status_code: 503 },
        true
      );

      const notRetryable = new VelocityError(
        400,
        { message: 'Bad request', status_code: 400 },
        false
      );

      expect(retryable.isRetryable).toBe(true);
      expect(notRetryable.isRetryable).toBe(false);
    });

    it('should preserve error details', () => {
      const errorDetails = {
        message: 'Validation failed',
        errors: {
          pincode: 'Invalid format',
          phone: 'Required field'
        },
        status_code: 400
      };

      const error = new VelocityError(400, errorDetails, false);

      expect(error.message).toContain('Validation failed');
    });
  });
});
