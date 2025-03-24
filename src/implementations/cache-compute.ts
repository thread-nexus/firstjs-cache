import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { handleCacheError } from '../utils/error-utils';
import { CacheOptions } from '../types/common';

/**
 * Options for compute operations
 */
interface ComputeOptions extends CacheOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  staleIfError?: boolean;
}

/**
 * Result of a compute operation
 */
interface ComputeResult<T> {
  value: T;
  computeTime: number;
  stale: boolean;
}

// Create a new extended options type that includes metadata
interface ExtendedCacheOptions extends CacheOptions {
  metadata?: {
    computeTime?: number;
    source?: string;
    version?: string;
    [key: string]: any;
  };
}

// Create a proper interface for internal use that extends the public interface
interface InternalCacheOptions {
  ttl?: number;
  tags?: string[];
  // Standard properties from CacheOptions
  compression?: boolean;
  compressionThreshold?: number;
  background?: boolean;
  maxSize?: number;
  maxItems?: number;
  compressionLevel?: number;
  refreshThreshold?: number;
  statsInterval?: number;
  providers?: string[];
  defaultProvider?: string;
  backgroundRefresh?: boolean;
  operation?: string;
  computeTime?: number;
  maxRetries?: number;
  compressed?: boolean;
  // Additional internal properties for metadata
  _metadata?: {
    computeTime?: number;
    source?: string;
    timestamp?: number;
    [key: string]: any;
  };
}

/**
 * Cache compute implementation
 */
export class CacheCompute {
  private readonly defaultTtl: number;
  private readonly backgroundRefresh: boolean;
  private readonly refreshThreshold: number;
  private refreshPromises: Map<string, Promise<any>> = new Map();

  /**
   * Create a new cache compute instance
   *
   * @param provider - Cache provider
   * @param options - Compute options
   */
  constructor(
    private provider: ICacheProvider,
    private options: {
      defaultTtl?: number;
      backgroundRefresh?: boolean;
      refreshThreshold?: number;
    } = {}
  ) {
    this.defaultTtl = options.defaultTtl || 3600;
    this.backgroundRefresh = options.backgroundRefresh !== false;
    this.refreshThreshold = options.refreshThreshold || 0.75;
  }

  /**
   * Get a value from cache or compute it if not found
   *
   * @param key - Cache key
   * @param fetcher - Function to compute the value
   * @param options - Cache options
   * @returns Compute result
   */
  async getOrCompute<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: ComputeOptions
  ): Promise<ComputeResult<T>> {
    try {
      // Try to get from cache
      const cachedValue = await this.provider.get(key);

      // If found, check if refresh needed
      if (cachedValue !== null) {
        const metadata = await this.provider.getMetadata?.(key);
        const refreshedAt = typeof metadata?.refreshedAt === 'number' ? new Date(metadata.refreshedAt) : metadata?.refreshedAt;
        const isStale = this.isValueStale(refreshedAt, options);

        // Schedule background refresh if needed
        if (isStale && this.shouldBackgroundRefresh(options)) {
          await this.scheduleBackgroundRefresh(key, fetcher, options);
        }

        return {
          value: cachedValue,
          computeTime: metadata?.computeTime || 0,
          stale: isStale
        };
      }

      // Compute new value
      return await this.computeAndCache(key, fetcher, options);
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
   */
  private async computeAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: ComputeOptions
  ): Promise<ComputeResult<T>> {
    const startTime = performance.now();

    try {
      emitCacheEvent(CacheEventType.COMPUTE_START, { key });
      const value = await this.executeWithRetry(() => fetcher(), options);
      const computeTime = performance.now() - startTime;

      // Create internal options with metadata
      const internalOptions: InternalCacheOptions = {
        ...options,
        ttl: options?.ttl || this.defaultTtl,
        computeTime: computeTime,
        // Store metadata in our internal property
        _metadata: {
          computeTime: computeTime,
          source: 'compute',
          timestamp: Date.now()
        }
      };

      // Cache the computed value
      await this.provider.set(key, value, internalOptions as CacheOptions);

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
        error: error instanceof Error ? error : new Error(String(error))
      });
      throw error;
    }
  }

  /**
   * Execute with retry logic
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    options?: ComputeOptions
  ): Promise<T> {
    const maxRetries = options?.maxRetries || 3;
    const retryDelay = options?.retryDelay || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt >= maxRetries) {
          throw error;
        }

        const delay = retryDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw new Error('Exceeded maximum number of retries');
  }

  /**
   * Check if a value is stale
   */
  private isValueStale(
    refreshedAt?: Date,
    options?: CacheOptions
  ): boolean {
    if (!refreshedAt) return true;

    const ttl = options?.ttl || this.defaultTtl;
    const threshold = options?.refreshThreshold || this.refreshThreshold;

    const age = Date.now() - refreshedAt.getTime();
    return age > ttl * threshold * 1000;
  }

  /**
   * Check if background refresh should be used
   */
  private shouldBackgroundRefresh(options?: CacheOptions): boolean {
    return options?.backgroundRefresh ?? this.backgroundRefresh;
  }

  /**
   * Schedule a background refresh
   */
  private async scheduleBackgroundRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: ComputeOptions
  ): Promise<void> {
    // Check if refresh is already scheduled
    if (this.refreshPromises.has(key)) {
      return;
    }

    const refreshPromise = (async () => {
      try {
        emitCacheEvent(CacheEventType.REFRESH_START, { key });
        await this.computeAndCache(key, fetcher, options);
        emitCacheEvent(CacheEventType.REFRESH_SUCCESS, { key });
      } catch (error) {
        emitCacheEvent(CacheEventType.REFRESH_ERROR, { key, error: error instanceof Error ? error : new Error(String(error)) });
      } finally {
        this.refreshPromises.delete(key);
      }
    })();

    this.refreshPromises.set(key, refreshPromise);

    // Prevent refresh spam
    await new Promise(resolve => setTimeout(resolve, 60000));
    this.refreshPromises.delete(key);
  }

  /**
   * Schedule a refresh operation for a key
   *
   * @param key - Cache key to refresh
   * @param fetcher - Function to compute the new value
   * @param options - Cache options
   * @returns Promise that resolves when the refresh is complete
   */
  async scheduleRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: ComputeOptions
  ): Promise<void> {
    try {
      emitCacheEvent(CacheEventType.REFRESH_START, { key });
      await this.computeAndCache(key, fetcher, options);
      emitCacheEvent(CacheEventType.REFRESH_SUCCESS, { key });
    } catch (error) {
      emitCacheEvent(CacheEventType.REFRESH_ERROR, { key, error: error instanceof Error ? error : new Error(String(error)) });
      throw error;
    }
  }

  /**
   * Cancel background refresh for a key
   */
  cancelRefresh(key: string): void {
    this.refreshPromises.delete(key);
  }

  /**
   * Get status of compute operations
   */
  getRefreshStatus(): {
    activeComputes: number;
    activeRefreshes: number;
  } {
    return {
      activeComputes: 0,
      activeRefreshes: this.refreshPromises.size
    };
  }

  /**
   * Get status of compute operations
   */
  getComputeStatus(): {
    activeComputes: number;
    activeRefreshes: number;
  } {
    return {
      activeComputes: 0,
      activeRefreshes: this.refreshPromises.size
    };
  }
}
