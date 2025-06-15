/**
 * Caching System for EquiSplit
 * Provides both in-memory and Redis-based caching for optimal performance
 */

import Redis from 'ioredis';

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  tags?: string[]; // Cache tags for bulk invalidation
  serialize?: boolean; // Whether to JSON serialize/deserialize
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
}

class CacheManager {
  private static instance: CacheManager;
  private inMemoryCache: Map<string, CacheEntry<any>> = new Map();
  private redis: Redis | null = null;
  private readonly DEFAULT_TTL = 300; // 5 minutes
  private readonly MAX_MEMORY_ENTRIES = 1000;

  private constructor() {
    this.initializeRedis();
    this.startCleanupInterval();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  private initializeRedis(): void {
    if (process.env.REDIS_URL) {
      try {
        this.redis = new Redis(process.env.REDIS_URL, {
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
          lazyConnect: true,
        });

        this.redis.on('error', (error) => {
          console.warn('Redis connection error, falling back to in-memory cache:', error);
          this.redis = null;
        });

        this.redis.on('connect', () => {
          console.log('Redis cache connected successfully');
        });
      } catch (error) {
        console.warn('Failed to initialize Redis, using in-memory cache only:', error);
      }
    }
  }

  /**
   * Get data from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first if available
      if (this.redis) {
        try {
          const result = await this.redis.get(this.prefixKey(key));
          if (result) {
            return JSON.parse(result);
          }
        } catch (error) {
          console.warn('Redis get error, falling back to memory:', error);
        }
      }

      // Fallback to in-memory cache
      const entry = this.inMemoryCache.get(key);
      if (entry && this.isEntryValid(entry)) {
        return entry.data;
      }

      // Remove expired entry
      if (entry) {
        this.inMemoryCache.delete(key);
      }

      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  /**
   * Set data in cache
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl || this.DEFAULT_TTL;
    const tags = options.tags || [];

    try {
      // Store in Redis if available
      if (this.redis) {
        try {
          const serialized = JSON.stringify(data);
          await this.redis.setex(this.prefixKey(key), ttl, serialized);
          
          // Store tags for bulk invalidation
          if (tags.length > 0) {
            for (const tag of tags) {
              await this.redis.sadd(`tag:${tag}`, key);
              await this.redis.expire(`tag:${tag}`, ttl);
            }
          }
        } catch (error) {
          console.warn('Redis set error, falling back to memory:', error);
        }
      }

      // Always store in memory as backup
      this.setInMemory(key, data, ttl, tags);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<void> {
    try {
      // Delete from Redis
      if (this.redis) {
        await this.redis.del(this.prefixKey(key));
      }

      // Delete from memory
      this.inMemoryCache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    try {
      if (this.redis) {
        for (const tag of tags) {
          const keys = await this.redis.smembers(`tag:${tag}`);
          if (keys.length > 0) {
            await this.redis.del(...keys.map(k => this.prefixKey(k)));
            await this.redis.del(`tag:${tag}`);
          }
        }
      }

      // Invalidate from memory cache
      for (const [key, entry] of this.inMemoryCache.entries()) {
        if (entry.tags.some(tag => tags.includes(tag))) {
          this.inMemoryCache.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.flushdb();
      }
      this.inMemoryCache.clear();
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get or set cache with fallback function
   */
  async getOrSet<T>(
    key: string,
    fallbackFn: () => Promise<T> | T,
    options: CacheOptions = {}
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fallbackFn();
    await this.set(key, data, options);
    return data;
  }

  /**
   * Memoize function with caching
   */
  memoize<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options: {
      keyGenerator?: (...args: Parameters<T>) => string;
      ttl?: number;
      tags?: string[];
    } = {}
  ): T {
    const { keyGenerator, ttl, tags } = options;

    return (async (...args: Parameters<T>) => {
      const key = keyGenerator 
        ? keyGenerator(...args)
        : `memoized:${fn.name}:${JSON.stringify(args)}`;

      return this.getOrSet(key, () => fn(...args), { ttl, tags });
    }) as T;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    memoryEntries: number;
    redisConnected: boolean;
    memorySize: number;
  } {
    return {
      memoryEntries: this.inMemoryCache.size,
      redisConnected: this.redis?.status === 'ready',
      memorySize: this.calculateMemorySize()
    };
  }

  // Private helper methods

  private setInMemory<T>(key: string, data: T, ttl: number, tags: string[]): void {
    // Implement LRU eviction if at capacity
    if (this.inMemoryCache.size >= this.MAX_MEMORY_ENTRIES) {
      const firstKey = this.inMemoryCache.keys().next().value;
      this.inMemoryCache.delete(firstKey);
    }

    this.inMemoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000, // Convert to milliseconds
      tags
    });
  }

  private isEntryValid(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private prefixKey(key: string): string {
    return `equisplit:${key}`;
  }

  private startCleanupInterval(): void {
    // Clean up expired entries every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.inMemoryCache.entries()) {
        if (!this.isEntryValid(entry)) {
          this.inMemoryCache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
  }

  private calculateMemorySize(): number {
    let size = 0;
    for (const entry of this.inMemoryCache.values()) {
      size += JSON.stringify(entry).length;
    }
    return size;
  }
}

// Export singleton instance
export const cache = CacheManager.getInstance();

// Helper function for API response caching
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  options: {
    keyPrefix?: string;
    ttl?: number;
    tags?: string[];
    keyGenerator?: (...args: T) => string;
  } = {}
) {
  const { keyPrefix = 'api', ttl = 300, tags = [], keyGenerator } = options;

  return async (...args: T): Promise<R> => {
    const key = keyGenerator 
      ? `${keyPrefix}:${keyGenerator(...args)}`
      : `${keyPrefix}:${JSON.stringify(args)}`;

    return cache.getOrSet(key, () => fn(...args), { ttl, tags });
  };
}

// Specific cache functions for EquiSplit

export const dashboardCache = {
  getUserStats: (userId: string) => 
    cache.getOrSet(
      `dashboard:stats:${userId}`, 
      () => null, // This would be replaced by actual fetch function
      { ttl: 300, tags: ['dashboard', `user:${userId}`] }
    ),

  getCalculations: (userId: string, limit: number, offset: number) =>
    cache.getOrSet(
      `calculations:${userId}:${limit}:${offset}`,
      () => null, // This would be replaced by actual fetch function
      { ttl: 300, tags: ['calculations', `user:${userId}`] }
    ),

  invalidateUser: (userId: string) =>
    cache.invalidateByTags([`user:${userId}`]),

  invalidateCalculations: () =>
    cache.invalidateByTags(['calculations'])
};

// Cache middleware for API routes
export function cacheMiddleware(options: {
  ttl?: number;
  tags?: string[];
  keyGenerator?: (req: Request) => string;
} = {}) {
  return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function(...args: any[]) {
      const req = args[0]; // Assuming first arg is request
      const key = options.keyGenerator 
        ? options.keyGenerator(req)
        : `${propertyName}:${JSON.stringify(args)}`;

      return cache.getOrSet(
        key,
        () => method.apply(this, args),
        { ttl: options.ttl, tags: options.tags }
      );
    };

    return descriptor;
  };
}