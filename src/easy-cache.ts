/**
 * @fileoverview Easy cache API for simple usage
 */

import {CacheManagerCore} from './implementations';
import {MemoryProvider} from './providers/memory-provider';
import {CacheOptions} from './types';

/**
 * Create a simple cache instance
 * 
 * @param options Cache options
 * @returns Cache instance
 */
export function createCache(options: CacheOptions = {}) {
  const cacheManager = new CacheManagerCore();
  
  // Register memory provider
  cacheManager.registerProvider('memory', new MemoryProvider(), 100);
  
  return {
    /**
     * Get a value from cache
     */
    async get<T = any>(key: string): Promise<T | null> {
      return cacheManager.get<T>(key);
    },
    
    /**
     * Set a value in cache
     */
    async set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> {
      return cacheManager.set<T>(key, value, options);
    },
    
    /**
     * Delete a value from cache
     */
    async delete(key: string): Promise<boolean> {
      return cacheManager.delete(key);
    },
    
    /**
     * Clear the entire cache
     */
    async clear(): Promise<void> {
      return cacheManager.clear();
    },
    
    /**
     * Get a value from cache or compute it if not found
     */
    async getOrCompute<T = any>(
      key: string, 
      fetcher: () => Promise<T>, 
      options?: CacheOptions
    ): Promise<T> {
      return cacheManager.getOrCompute<T>(key, fetcher, options);
    },
    
    /**
     * Get cache stats
     */
    async getStats() {
      return cacheManager.getStats();
    },
    
    /**
     * Check cache health
     */
    async healthCheck() {
      return cacheManager.healthCheck();
    },
    
    /**
     * Get the underlying cache manager
     */
    getCacheManager() {
      return cacheManager;
    }
  };
}

// Export the create function as default
export default createCache;

// Export the cache manager for advanced usage
export { CacheManagerCore };

// Export memory provider for direct usage
export { MemoryProvider };