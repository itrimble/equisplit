/**
 * Rate Limiter Implementation
 * Provides in-memory rate limiting with configurable windows and request limits
 * For production, consider using Redis or another distributed store
 */

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

interface RequestRecord {
  count: number;
  resetTime: number;
}

export class RateLimiter {
  private store = new Map<string, RequestRecord>();
  private options: Required<RateLimitOptions>;

  constructor(options: RateLimitOptions) {
    this.options = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...options,
    };

    // Clean up expired entries every 5 minutes
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if a request should be allowed for the given identifier
   * @param identifier - Usually IP address or user ID
   * @returns true if request is allowed, false if rate limited
   */
  checkLimit(identifier: string): boolean {
    const now = Date.now();
    const record = this.store.get(identifier);

    if (!record || now > record.resetTime) {
      // No record or window expired, allow request and create new record
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.options.windowMs,
      });
      return true;
    }

    if (record.count >= this.options.maxRequests) {
      // Rate limit exceeded
      return false;
    }

    // Increment count and allow request
    record.count++;
    return true;
  }

  /**
   * Get rate limit info for an identifier
   * @param identifier - Usually IP address or user ID
   * @returns Rate limit information
   */
  getRateLimitInfo(identifier: string): {
    remaining: number;
    resetTime: number;
    total: number;
  } {
    const now = Date.now();
    const record = this.store.get(identifier);

    if (!record || now > record.resetTime) {
      return {
        remaining: this.options.maxRequests,
        resetTime: now + this.options.windowMs,
        total: this.options.maxRequests,
      };
    }

    return {
      remaining: Math.max(0, this.options.maxRequests - record.count),
      resetTime: record.resetTime,
      total: this.options.maxRequests,
    };
  }

  /**
   * Reset the rate limit for a specific identifier
   * @param identifier - Usually IP address or user ID
   */
  reset(identifier: string): void {
    this.store.delete(identifier);
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.store.clear();
  }

  /**
   * Get current store size (for monitoring)
   */
  getStoreSize(): number {
    return this.store.size;
  }

  /**
   * Clean up expired entries from the store
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.store.delete(key);
    }

    // Log cleanup for monitoring in development
    if (process.env.NODE_ENV === "development" && expiredKeys.length > 0) {
      console.log(`Rate limiter cleaned up ${expiredKeys.length} expired entries`);
    }
  }
}

/**
 * Distributed Rate Limiter using external store
 * For production use with Redis or similar
 */
export class DistributedRateLimiter {
  private options: Required<RateLimitOptions>;
  private store: any; // External store interface

  constructor(options: RateLimitOptions, store: any) {
    this.options = {
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      ...options,
    };
    this.store = store;
  }

  async checkLimit(identifier: string): Promise<boolean> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();

    try {
      // This would be implemented with Redis MULTI/EXEC for atomicity
      const current = await this.store.get(key);
      
      if (!current) {
        await this.store.set(key, JSON.stringify({
          count: 1,
          resetTime: now + this.options.windowMs
        }), 'PX', this.options.windowMs);
        return true;
      }

      const record = JSON.parse(current);
      
      if (now > record.resetTime) {
        await this.store.set(key, JSON.stringify({
          count: 1,
          resetTime: now + this.options.windowMs
        }), 'PX', this.options.windowMs);
        return true;
      }

      if (record.count >= this.options.maxRequests) {
        return false;
      }

      record.count++;
      await this.store.set(key, JSON.stringify(record), 'PX', record.resetTime - now);
      return true;
    } catch (error) {
      // On error, allow the request (fail open)
      console.error('Rate limiter error:', error);
      return true;
    }
  }
}

// Singleton instances for common use cases
export const globalRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
});

export const authRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 5, // 5 auth attempts per minute
});

export const apiRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 API calls per minute
});