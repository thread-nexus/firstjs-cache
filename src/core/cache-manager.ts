/**
 * @fileoverview Main cache manager implementation
 */

import { MemoryStorageAdapter } from '../implementations/adapters/MemoryStorageAdapter';
import { CacheConfig } from '../types/cache-types';
import { DEFAULT_CONFIG } from '../config/default-config';
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { CacheManagerOperations } from '../implementations/cache-manager-operations';
import { CacheMetadata } from '../implementations/CacheMetadata';
import { handleCacheError } from '../utils/error-utils';

/**
 * Main cache manager class
 */
export class CacheManager {
  private readonly config: CacheConfig;
  private providers: Map<string, MemoryStorageAdapter> = new Map();
  private metadata: CacheMetadata = new CacheMetadata();
  private readonly operations: CacheManagerOperations;

  /**
   * Create a new cache manager
   * 
   * @param config - Cache configuration
   */
  constructor(config: Partial<CacheConfig> = {}) {
    // Merge with default config
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      defaultOptions: {
        ...DEFAULT_CONFIG.defaultOptions,
        ...config.defaultOptions
      }
    };

    // Initialize default memory provider
    const memoryProvider = new MemoryStorageAdapter({
      maxSize: 100 * 1024 * 1024, // 100MB
      maxItems: 10000,
      defaultTtl: this.config.defaultTtl
    });
    
    this.providers.set('memory', memoryProvider);
    this.operations = new CacheManagerOperations(memoryProvider);
    
    // Log initialization
    if (this.config.logging) {
      console.log('Cache manager initialized with config:', {
        defaultTtl: this.config.defaultTtl,
        deduplicateRequests: this.config.deduplicateRequests,
        backgroundRefresh: this.config.backgroundRefresh
      });
    }
    
    emitCacheEvent(CacheEventType.INIT, { config: this.config });
  }

  /**
   * Get a value from the cache
   * 
   * @param key - Cache key
   * @param options - Get options
   * @returns Cached value or null if not found
   */
  async get<T = any>(key: string, options?: {
    provider?: string;
    defaultValue?: T;
    throwOnError?: boolean;
  }): Promise<T | null> {
    const provider = this.getProvider(options?.provider);
    const throwOnError = options?.throwOnError ?? this.config.throwOnErrors;
    
    try {
      const value = await provider.get<T>(key);
      
      if (value === null) {
        // Record cache miss
        emitCacheEvent(CacheEventType.MISS, { key });
        
        // Return default value if provided
        return options?.defaultValue !== undefined ? options.defaultValue : null;
      }
      
      // Record cache hit and update metadata
      emitCacheEvent(CacheEventType.HIT, { key });
      this.metadata.recordAccess(key);
      
      return value;
    } catch (error) {
      const cacheError = handleCacheError(error, { 
        operation: 'get', 
        key,
        provider: options?.provider || 'memory'
      }, { throwError: throwOnError });
      
      if (throwOnError) {
        throw cacheError;
      }
      
      return options?.defaultValue !== undefined ? options.defaultValue : null;
    }
  }

  /**
   * Set a value in the cache
   * 
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Set options
   */
  async set<T = any>(key: string, value: T, options?: {
    ttl?: number;
    tags?: string[];
    provider?: string;
    throwOnError?: boolean;
  }): Promise<void> {
    const provider = this.getProvider(options?.provider);
    const ttl = options?.ttl ?? this.config.defaultOptions.ttl;
    const throwOnError = options?.throwOnError ?? this.config.throwOnErrors;
    
    try {
      await provider.set(key, value, { ttl });
      
      // Set metadata
      this.metadata.set(key, {
        tags: options?.tags || []
      });
      
      emitCacheEvent(CacheEventType.SET, { 
        key,
        ttl,
        tags: options?.tags
      });
    } catch (error) {
      handleCacheError(error, { 
        operation: 'set', 
        key,
        provider: options?.provider || 'memory'
      }, { throwError: throwOnError });
    }
  }

  /**
   * Delete a value from the cache
   * 
   * @param key - Cache key
   * @param options - Delete options
   * @returns True if value was deleted
   */
  async delete(key: string, options?: {
    provider?: string;
    throwOnError?: boolean;
  }): Promise<boolean> {
    const provider = this.getProvider(options?.provider);
    const throwOnError = options?.throwOnError ?? this.config.throwOnErrors;
    
    try {
      const deleted = await provider.delete(key);
      
      if (deleted) {
        // Delete metadata
        this.metadata.delete(key);
        
        emitCacheEvent(CacheEventType.DELETE, { key });
      }
      
      return deleted;
    } catch (error) {
      handleCacheError(error, { 
        operation: 'delete', 
        key,
        provider: options?.provider || 'memory'
      }, { throwError: throwOnError });
      
      return false;
    }
  }

  /**
   * Check if a key exists in the cache
   * 
   * @param key - Cache key
   * @param options - Options
   * @returns True if key exists
   */
  async has(key: string, options?: {
    provider?: string;
    throwOnError?: boolean;
  }): Promise<boolean> {
    const provider = this.getProvider(options?.provider);
    const throwOnError = options?.throwOnError ?? this.config.throwOnErrors;
    
    try {
      return await provider.has(key);
    } catch (error) {
      handleCacheError(error, { 
        operation: 'has', 
        key,
        provider: options?.provider || 'memory'
      }, { throwError: throwOnError });
      
      return false;
    }
  }

  /**
   * Clear all values from the cache
   * 
   * @param options - Clear options
   */
  async clear(options?: {
    provider?: string;
    throwOnError?: boolean;
  }): Promise<void> {
    const provider = this.getProvider(options?.provider);
    const throwOnError = options?.throwOnError ?? this.config.throwOnErrors;
    
    try {
      await provider.clear();
      
      // Clear metadata
      this.metadata.clear();
      
      emitCacheEvent(CacheEventType.CLEAR, {});
    } catch (error) {
      handleCacheError(error, { 
        operation: 'clear',
        provider: options?.provider || 'memory'
      }, { throwError: throwOnError });
    }
  }

  /**
   * Get multiple values from the cache
   * 
   * @param keys - Cache keys
   * @param options - Get options
   * @returns Object mapping keys to values
   */
  async getMany<T = any>(keys: string[], options?: {
    provider?: string;
    throwOnError?: boolean;
  }): Promise<Record<string, T | null>> {
    const provider = this.getProvider(options?.provider);
    const throwOnError = options?.throwOnError ?? this.config.throwOnErrors;
    
    try {
      const results = await provider.getMany<T>(keys);
      
      // Record cache hits/misses and update metadata
      for (const [key, value] of Object.entries(results)) {
        if (value !== null) {
          emitCacheEvent(CacheEventType.HIT, { key });
          this.metadata.recordAccess(key);
        } else {
          emitCacheEvent(CacheEventType.MISS, { key });
        }
      }
      
      return results;
    } catch (error) {
      handleCacheError(error, { 
        operation: 'getMany', 
        keys,
        provider: options?.provider || 'memory'
      }, { throwError: throwOnError });
      
      // Return empty results
      return keys.reduce((acc, key) => {
        acc[key] = null;
        return acc;
      }, {} as Record<string, T | null>);
    }
  }

  /**
   * Set multiple values in the cache
   * 
   * @param entries - Key-value pairs to set
   * @param options - Set options
   */
  async setMany<T = any>(entries: Record<string, T>, options?: {
    ttl?: number;
    tags?: string[];
    provider?: string;
    throwOnError?: boolean;
  }): Promise<void> {
    const provider = this.getProvider(options?.provider);
    const ttl = options?.ttl ?? this.config.defaultOptions.ttl;
    const throwOnError = options?.throwOnError ?? this.config.throwOnErrors;
    
    try {
      await provider.setMany(entries, { ttl });
      
      // Set metadata for each key
      for (const key of Object.keys(entries)) {
        this.metadata.set(key, {
          tags: options?.tags || []
        });
      }
      
      emitCacheEvent(CacheEventType.SET_MANY, { 
        keys: Object.keys(entries),
        ttl,
        tags: options?.tags
      });
    } catch (error) {
      handleCacheError(error, { 
        operation: 'setMany', 
        keys: Object.keys(entries),
        provider: options?.provider || 'memory'
      }, { throwError: throwOnError });
    }
  }

  /**
   * Get cache operations for advanced functionality
   * 
   * @param provider - Provider name
   * @returns Cache operations
   */
  getOperations(provider?: string): CacheManagerOperations {
    return this.operations;
  }

  /**
   * Get cache statistics
   * 
   * @returns Cache statistics
   */
  async getStats(): Promise<Record<string, any>> {
    try {
      const memoryProvider = this.providers.get('memory');
      const stats: Record<string, any> = {
        memory: await memoryProvider?.getStats() || {}
      };
      
      // Add metadata stats
      stats.metadata = this.metadata.getStats();
      
      return stats;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return { error: 'Failed to get cache statistics' };
    }
  }

  /**
   * Get a provider by name
   * 
   * @param name - Provider name
   * @returns Cache provider
   */
  private getProvider(name?: string): MemoryStorageAdapter {
    const providerName = name || 'memory';
    const provider = this.providers.get(providerName);
    
    if (!provider) {
      throw new Error(`Provider not found: ${providerName}`);
    }
    
    return provider;
  }
}