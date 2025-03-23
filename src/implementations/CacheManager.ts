import { ICacheManager } from '../interfaces/i-cache-manager';
import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheOptions, CacheStats, EntryMetadata } from '../types/common';
import { CacheMetadata } from './CacheMetadata';

/**
 * CacheManager implementation
 */
export class CacheManager implements ICacheManager {
  private providers: Map<string, ICacheProvider> = new Map();
  private metadata: CacheMetadata = new CacheMetadata();

  /**
   * Register a cache provider
   * 
   * @param name Unique name for the provider
   * @param provider The cache provider instance
   */
  registerProvider(name: string, provider: ICacheProvider): void {
    this.providers.set(name, provider);
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    for (const provider of this.providers.values()) {
      const value = await provider.get(key);
      if (value !== null) {
        this.metadata.recordAccess(key);
        return value;
      }
    }
    return null;
  }

  /**
   * Store a value in cache
   */
  async set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.set(key, value, options);
    }
    this.metadata.set(key, { tags: options?.tags || [] });
  }

  /**
   * Delete a value from all cache layers
   */
  async delete(key: string): Promise<boolean> {
    let deleted = false;
    for (const provider of this.providers.values()) {
      deleted = (await provider.delete(key)) || deleted;
    }
    this.metadata.delete(key);
    return deleted;
  }

  /**
   * Clear all cache layers
   */
  async clear(): Promise<void> {
    for (const provider of this.providers.values()) {
      await provider.clear();
    }
    this.metadata.clear();
  }

  /**
   * Get cache statistics from all layers
   */
  async getStats(): Promise<Record<string, CacheStats>> {
    const stats: Record<string, CacheStats> = {};
    for (const [name, provider] of this.providers.entries()) {
      stats[name] = await provider.getStats();
    }
    return stats;
  }

  /**
   * Get or compute a value - returns from cache if available or computes and caches it
   */
  async getOrCompute<T = any>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    const cachedValue = await this.get<T>(key);
    if (cachedValue !== null) {
      return cachedValue;
    }

    const computedValue = await fn();
    await this.set(key, computedValue, options);
    return computedValue;
  }

  /**
   * Wrap a function with caching
   */
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator?: (...args: ((P & ((...args: P) => any)) | never[])[]) => string,
    options?: CacheOptions
  ): T & { invalidateCache: (...args: ((P & ((...args: P) => any)) | never[])[]) => Promise<void> } {
    const wrappedFunction = async (...args: ((P & ((...args: P) => any)) | never[])[]): Promise<ReturnType<T>> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      return this.getOrCompute(key, () => fn(...args), options);
    };

    wrappedFunction.invalidateCache = async (...args: ((P & ((...args: P) => any)) | never[])[]): Promise<void> => {
      const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);
      await this.delete(key);
    };

    return wrappedFunction as T & { invalidateCache: (...args: ((P & ((...args: P) => any)) | never[])[]) => Promise<void> };
  }

  /**
   * Invalidate all entries with a given tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    const keys = this.metadata.findByTag(tag);
    for (const key of keys) {
      await this.delete(key);
    }
  }

  /**
   * Get a specific cache provider by layer name
   */
  getProvider(layer: string): ICacheProvider | null {
    return this.providers.get(layer) || null;
  }

  /**
   * Get metadata for a cache key
   */
  getMetadata(key: string): EntryMetadata | undefined {
    return this.metadata.get(key);
  }

  /**
   * Invalidate cache entries by prefix
   */
  async invalidateByPrefix(prefix: string): Promise<void> {
    const keys = this.metadata.findByPrefix(prefix);
    for (const key of keys) {
      await this.delete(key);
    }
  }

  /**
   * Delete cache entries matching a pattern
   */
  async deleteByPattern(pattern: string): Promise<void> {
    const keys = this.metadata.findByPattern(pattern);
    for (const key of keys) {
      await this.delete(key);
    }
  }

  /**
   * Get all keys matching a pattern
   */
  async keys(pattern?: string): Promise<string[]> {
    if (!pattern) {
      return this.metadata.keys();
    }
    return this.metadata.findByPattern(pattern);
  }

  /**
   * Get multiple values from cache
   */
  async getMany(keys: string[]): Promise<Record<string, any>> {
    const result: Record<string, any> = {};
    for (const key of keys) {
      result[key] = await this.get(key);
    }
    return result;
  }

  /**
   * Set multiple values in cache
   */
  async setMany(entries: Record<string, any>, options?: CacheOptions): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await this.set(key, value, options);
    }
  }
}