/**
 * @fileoverview Advanced computation handling with caching, background refresh,
 * and stale-while-revalidate pattern implementation.
 */

import { CacheOptions } from '../types/common';
import { emitCacheEvent, CacheEventType } from '../events/cache-events';
import { handleCacheError } from '../utils/error-utils';
import { ICacheProvider } from '../interfaces/i-cache-provider';

// Track compute operations in progress
const computeOperations = new Map<string, Promise<any>>();

// Track background refresh operations
const refreshOperations = new Map<string, {
  nextRefresh: number;
  promise: Promise<void>;
}>();

interface ComputeResult<T> {
  value: T;
  computeTime: number;
  stale: boolean;
}

export class CacheCompute {
  constructor(
    private provider: ICacheProvider,
    private options: {
      defaultTtl?: number;
      backgroundRefresh?: boolean;
      refreshThreshold?: number;
      maxRetries?: number;
      retryDelay?: number;
    } = {}
  ) {}

  /**
   * Get or compute a cached value with advanced features
   */
  async getOrCompute<T>(
    key: string,
    compute: () => Promise<T>,
    options?: CacheOptions
  ): Promise<ComputeResult<T>> {
    // Check for in-progress computation
    const inProgress = computeOperations.get(key);
    if (inProgress) {
      return inProgress;
    }

    try {
      // Try to get from cache first
      const cached = await this.provider.get(key);
      if (cached !== null) {
        const metadata = await this.provider.getMetadata?.(key);
        const isStale = this.isValueStale(metadata?.refreshedAt, options);

        // Schedule background refresh if needed
        if (isStale && this.shouldBackgroundRefresh(options)) {
          this.scheduleBackgroundRefresh(key, compute, options);
        }

        return {
          value: cached,
          computeTime: metadata?.computeTime || 0,
          stale: isStale
        };
      }

      // Compute new value
      return this.computeAndCache(key, compute, options);
    } catch (error) {
      handleCacheError(error, {
        operation: 'getOrCompute',
        key
      });
      throw error;
    }
  }

  /**
   * Compute value and cache it
   * @private
   */
  private async computeAndCache<T>(
    key: string,
    compute: () => Promise<T>,
    options?: CacheOptions
  ): Promise<ComputeResult<T>> {
    const computePromise = (async () => {
      const startTime = performance.now();
      
      try {
        emitCacheEvent(CacheEventType.COMPUTE_START, { key });
        
        const value = await this.executeWithRetry(() => compute());
        const computeTime = performance.now() - startTime;

        // Cache the computed value
        await this.provider.set(key, value, {
          ...options,
          computeTime,
          refreshedAt: new Date()
        });

        emitCacheEvent(CacheEventType.COMPUTE_SUCCESS, {
          key,
          duration: computeTime
        });

        return {
          value,
          computeTime,
          stale: false
        };
      } catch (error) {
        emitCacheEvent(CacheEventType.COMPUTE_ERROR, {
          key,
          error
        });
        throw error;
      } finally {
        computeOperations.delete(key);
      }
    })();

    computeOperations.set(key, computePromise);
    return computePromise;
  }

  /**
   * Execute with retry logic
   * @private
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    attempt: number = 1
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= (this.options.maxRetries || 3)) {
        throw error;
      }

      const delay = (this.options.retryDelay || 1000) * Math.pow(2, attempt - 1);
      await new Promise(resolve => setTimeout(resolve, delay));

      return this.executeWithRetry(operation, attempt + 1);
    }
  }

  /**
   * Check if a value is stale
   * @private
   */
  private isValueStale(
    refreshedAt?: Date,
    options?: CacheOptions
  ): boolean {
    if (!refreshedAt) return true;

    const ttl = options?.ttl || this.options.defaultTtl || 3600;
    const threshold = options?.refreshThreshold || 
                     this.options.refreshThreshold || 
                     0.75;

    const age = Date.now() - refreshedAt.getTime();
    return age > ttl * threshold * 1000;
  }

  /**
   * Check if background refresh should be used
   * @private
   */
  private shouldBackgroundRefresh(options?: CacheOptions): boolean {
    return options?.backgroundRefresh ?? 
           this.options.backgroundRefresh ?? 
           false;
  }

  /**
   * Schedule a background refresh
   * @private
   */
  private scheduleBackgroundRefresh<T>(
    key: string,
    compute: () => Promise<T>,
    options?: CacheOptions
  ): void {
    // Check if refresh is already scheduled
    const existing = refreshOperations.get(key);
    if (existing && existing.nextRefresh > Date.now()) {
      return;
    }

    const refreshPromise = (async () => {
      try {
        emitCacheEvent(CacheEventType.REFRESH_START, { key });
        
        const { value, computeTime } = await this.computeAndCache(
          key,
          compute,
          options
        );

        emitCacheEvent(CacheEventType.REFRESH_SUCCESS, {
          key,
          duration: computeTime
        });

        return value;
      } catch (error) {
        emitCacheEvent(CacheEventType.REFRESH_ERROR, {
          key,
          error
        });
      } finally {
        refreshOperations.delete(key);
      }
    })();

    refreshOperations.set(key, {
      nextRefresh: Date.now() + 60000, // Prevent refresh spam
      promise: refreshPromise
    });
  }

  /**
   * Cancel background refresh for a key
   */
  cancelBackgroundRefresh(key: string): void {
    refreshOperations.delete(key);
  }

  /**
   * Get status of compute operations
   */
  getComputeStatus(): {
    activeComputes: number;
    activeRefreshes: number;
  } {
    return {
      activeComputes: computeOperations.size,
      activeRefreshes: refreshOperations.size
    };
  }
}