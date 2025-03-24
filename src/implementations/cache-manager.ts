import { CacheOptions } from '../types/common';
import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheMetadata } from './CacheMetadata';
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { handleCacheError, ensureError } from '../utils/error-utils';
import { mergeCacheOptions } from './cache-manager-utils';
import { DEFAULT_CONFIG, CACHE_CONSTANTS } from '../config/default-config';

/**
 * Main cache manager implementation
 */
export class CacheManager {
  private providers = new Map<string, ICacheProvider>();
  private metadata = new CacheMetadata();
  private config = DEFAULT_CONFIG;

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
      for (const provider of this.providers.values()) {
        const value = await provider.get(key);
        if (value !== null) {
          this.metadata.recordAccess(key);
          return value;
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
      for (const provider of this.providers.values()) {
        await provider.set(key, value, options);
      }
      this.metadata.set(key, { tags: options?.tags || [] });
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
        if (await provider.has(key)) {
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
      // Check cache first
      const cachedValue = await this.get<T>(key);
      if (cachedValue !== null) {
        return cachedValue;
      }
      
      // Compute value
      emitCacheEvent(CacheEventType.COMPUTE_START, { key });
      const value = await fetcher();
      
      // Store in cache
      await this.set(key, value, options);
      emitCacheEvent(CacheEventType.COMPUTE_SUCCESS, { key });
      
      return value;
    } catch (error) {
      const safeError = ensureError(error);
      emitCacheEvent(CacheEventType.COMPUTE_ERROR, { 
        key, 
        error: safeError 
      });
      throw safeError;
    }
  }

  /**
   * Create a cached wrapper for a function
   */
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator: (...args: T extends ((...args: infer P) => any) ? P : never[]) => string,
    options?: CacheOptions
  ): T {
    return (async (...args: T extends ((...args: infer P) => any) ? P : never[]) => {
      const key = keyGenerator(...args);
      return this.getOrCompute(
        key,
        () => fn(...args),
        options
      );
    }) as T;
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
      if (firstProvider && typeof firstProvider.getMany === 'function') {
        return await firstProvider.getMany<T>(keys);
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
      const mergedOptions = mergeCacheOptions(options, this.config.defaultOptions);
      
      // Try to use batch set if available on first provider
      const firstProvider = [...this.providers.values()][0];
      if (firstProvider && typeof firstProvider.setMany === 'function') {
        await firstProvider.setMany(entries, mergedOptions);
        
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
        if (typeof provider.getStats === 'function') {
          stats.providers[name] = await provider.getStats();
        }
      }
      
      emitCacheEvent(CacheEventType.STATS_UPDATE, { stats });
      return stats;
    } catch (error) {
      handleCacheError(error, { operation: 'getStats' });
      return {};
    }
  }
}