import { CacheOptions, CacheStats, EntryMetadata } from '../types/common';
import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheMetadata } from './cache-metadata';
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { handleCacheError, ensureError, CacheErrorCode, createCacheError } from '../utils/error-utils';
import { mergeCacheOptions, providerHasMethod } from './cache-manager-utils';
import { DEFAULT_CONFIG, CACHE_CONSTANTS } from '../config/default-config';

/**
 * Main cache manager implementation
 */
export class CacheManager {
  private providers = new Map<string, ICacheProvider>();
  private metadata = new CacheMetadata();
  private config = DEFAULT_CONFIG;
  private inFlightRequests = new Map<string, Promise<any>>();

  /**
   * Create a new cache manager
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      // Validate key
      if (!key) {
        throw createCacheError('Invalid cache key', CacheErrorCode.INVALID_KEY);
      }

      for (const provider of this.providers.values()) {
        const value = await provider.get(key);
        if (value !== null) {
          this.metadata.recordAccess(key);
          return value as T;
        }
      }
      return null;
    } catch (error) {
      handleCacheError(error, { operation: 'get', key });
      return null;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      // Validate key and value
      if (!key) {
        throw createCacheError('Invalid cache key', CacheErrorCode.INVALID_KEY);
      }
      
      if (value === undefined) {
        throw createCacheError('Cannot cache undefined value', CacheErrorCode.INVALID_VALUE);
      }

      const mergedOptions = mergeCacheOptions(options, this.config.defaultOptions);
      
      for (const provider of this.providers.values()) {
        await provider.set(key, value, mergedOptions);
      }
      
      this.metadata.set(key, { tags: mergedOptions.tags || [] });
    } catch (error) {
      handleCacheError(error, { operation: 'set', key });
      throw error;
    }
  }

  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      let deleted = false;
      for (const provider of this.providers.values()) {
        const result = await provider.delete(key);
        deleted = deleted || result;
      }
      
      if (deleted) {
        this.metadata.delete(key);
      }
      
      return deleted;
    } catch (error) {
      handleCacheError(error, { operation: 'delete', key });
      return false;
    }
  }

  /**
   * Clear all values from cache
   */
  async clear(): Promise<void> {
    try {
      for (const provider of this.providers.values()) {
        await provider.clear();
      }
      
      this.metadata.clear();
    } catch (error) {
      handleCacheError(error, { operation: 'clear' });
    }
  }

  /**
   * Check if a key exists in cache
   */
  async has(key: string): Promise<boolean> {
    try {
      for (const provider of this.providers.values()) {
        // Safely check if provider.has exists before calling
        if (provider && typeof provider.has === 'function' && await provider.has(key)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      handleCacheError(error, { operation: 'has', key });
      return false;
    }
  }

  /**
   * Register a cache provider
   */
  registerProvider(name: string, provider: ICacheProvider): void {
    // Add name property to provider if it doesn't exist
    if (!provider.name) {
      (provider as any).name = name;
    }
    
    this.providers.set(name, provider);
    emitCacheEvent(CacheEventType.PROVIDER_INITIALIZED, { provider: name });
  }

  /**
   * Get or compute a value
   */
  async getOrCompute<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    try {
      // Check if we should deduplicate in-flight requests
      if (this.config.deduplicateRequests && this.inFlightRequests.has(key)) {
        return await this.inFlightRequests.get(key) as T;
      }
      
      // Check cache first
      const cachedValue = await this.get<T>(key);
      if (cachedValue !== null) {
        return cachedValue;
      }
      
      // Create a promise for this request
      const fetchPromise = (async () => {
        try {
          // Compute value
          emitCacheEvent(CacheEventType.COMPUTE_START, { key });
          const value = await fetcher();
          
          // Store in cache
          await this.set(key, value, options);
          emitCacheEvent(CacheEventType.COMPUTE_SUCCESS, { key });
          
          return value;
        } finally {
          // Remove from in-flight requests
          this.inFlightRequests.delete(key);
        }
      })();
      
      // Store the promise for deduplication
      if (this.config.deduplicateRequests) {
        this.inFlightRequests.set(key, fetchPromise);
      }
      
      return await fetchPromise;
    } catch (error) {
      const safeError = ensureError(error);
      emitCacheEvent(CacheEventType.COMPUTE_ERROR, { 
        key, 
        error: safeError 
      });
      
      // Remove from in-flight requests
      this.inFlightRequests.delete(key);
      
      throw safeError;
    }
  }

  /**
   * Create a cached wrapper for a function
   */
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator: (...args: Parameters<T>) => string,
    options?: CacheOptions
  ): T {
    const wrappedFn = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      const key = keyGenerator(...args);
      return this.getOrCompute(
        key,
        () => fn(...args),
        options
      ) as Promise<ReturnType<T>>;
    };
    
    return wrappedFn as T;
  }

  /**
   * Invalidate cache entries by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    try {
      const keys = this.metadata.findByTag(tag);
      
      let count = 0;
      for (const key of keys) {
        const deleted = await this.delete(key);
        if (deleted) count++;
      }
      
      emitCacheEvent(CacheEventType.INVALIDATE, {
        tag,
        entriesRemoved: count
      });
      
      return count;
    } catch (error) {
      handleCacheError(error, { operation: 'invalidateByTag', tag });
      return 0;
    }
  }

  /**
   * Invalidate cache entries by prefix
   */
  async invalidateByPrefix(prefix: string): Promise<number> {
    try {
      const keys = this.metadata.findByPrefix(prefix);
      
      let count = 0;
      for (const key of keys) {
        const deleted = await this.delete(key);
        if (deleted) count++;
      }
      
      emitCacheEvent(CacheEventType.INVALIDATE, {
        prefix,
        entriesRemoved: count
      });
      
      return count;
    } catch (error) {
      handleCacheError(error, { operation: 'invalidateByPrefix', prefix });
      return 0;
    }
  }

  /**
   * Get multiple values from cache
   */
  async getMany<T>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    
    try {
      // Try to use batch get if available on first provider
      const firstProvider = [...this.providers.values()][0];
      if (firstProvider && providerHasMethod(firstProvider, 'getMany')) {
        const getMany = firstProvider.getMany as <U>(keys: string[]) => Promise<Record<string, U | null>>;
        return await getMany<T>(keys);
      }
      
      // Fall back to individual gets
      for (const key of keys) {
        result[key] = await this.get<T>(key);
      }
      
      return result;
    } catch (error) {
      handleCacheError(error, { operation: 'getMany', keys });
      
      // Ensure we return something for each key
      for (const key of keys) {
        if (!(key in result)) {
          result[key] = null;
        }
      }
      
      return result;
    }
  }

  /**
   * Set multiple values in cache
   */
  async setMany<T>(entries: Record<string, T>, options?: CacheOptions): Promise<void> {
    try {
      // Fix defaultOptions access
      const ttl = this.config.defaultTtl;
      const mergedOptions: CacheOptions = {
        ...options,
        ttl: options?.ttl ?? ttl // Use nullish coalescing to only apply default if undefined
      };
      
      // Try to use batch set if available on first provider
      const firstProvider = [...this.providers.values()][0];
      if (firstProvider && providerHasMethod(firstProvider, 'setMany')) {
        const setMany = firstProvider.setMany as (entries: Record<string, any>, options?: CacheOptions) => Promise<void>;
        await setMany(entries, mergedOptions);
        
        // Update metadata
        for (const key of Object.keys(entries)) {
          this.metadata.set(key, { tags: mergedOptions.tags || [] });
        }
        
        return;
      }
      
      // Fall back to individual sets
      for (const [key, value] of Object.entries(entries)) {
        await this.set(key, value, mergedOptions);
      }
    } catch (error) {
      handleCacheError(error, { operation: 'setMany', entries: Object.keys(entries) });
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<Record<string, any>> {
    try {
      const stats: Record<string, any> = {
        providers: {},
        metadata: this.metadata.getStats()
      };
      
      // Collect stats from providers
      for (const [name, provider] of this.providers.entries()) {
        if (providerHasMethod(provider, 'getStats')) {
          const getStats = provider.getStats as () => Promise<any>;
          stats.providers[name] = await getStats();
        }
      }
      
      emitCacheEvent(CacheEventType.STATS_UPDATE, { stats });
      return stats;
    } catch (error) {
      handleCacheError(error, { operation: 'getStats' });
      return {};
    }
  }

  /**
   * Get a provider by name
   */
  getProvider(name: string): ICacheProvider | null {
    return this.providers.get(name) || null;
  }

  /**
   * Get metadata for a cache key
   */
  getMetadata(key: string): any {
    return this.metadata.get(key);
  }
}