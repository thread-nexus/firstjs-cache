/**
 * @fileoverview Memory cache provider implementation
 */

import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheOptions, CacheStats } from '../types/common';
import { MemoryStorageAdapter } from './memory-adapter';

/**
 * Memory cache provider implementation
 */
export class MemoryProvider implements ICacheProvider {
  private adapter: MemoryStorageAdapter;
  
  /**
   * Create a new memory cache provider
   * 
   * @param options - Memory storage options
   */
  constructor(options?: {
    maxSize?: number;
    maxItems?: number;
    defaultTtl?: number;
    updateAgeOnGet?: boolean;
    allowStale?: boolean;
  }) {
    this.adapter = new MemoryStorageAdapter(options);
  }
  
  /**
   * Get a value from the cache
   * 
   * @param key - Cache key
   * @returns Cached value or null if not found
   */
  async get<T = any>(key: string): Promise<T | null> {
    return this.adapter.get<T>(key);
  }
  
  /**
   * Set a value in the cache
   * 
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options
   */
  async set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> {
    await this.adapter.set(key, value, {
      ttl: options?.ttl,
      tags: options?.tags,
      compression: options?.compression,
      compressionThreshold: options?.compressionThreshold
    });
  }
  
  /**
   * Delete a value from the cache
   * 
   * @param key - Cache key
   * @returns Whether the key was deleted
   */
  async delete(key: string): Promise<boolean> {
    return this.adapter.delete(key);
  }
  
  /**
   * Clear all values from the cache
   */
  async clear(): Promise<void> {
    await this.adapter.clear();
  }
  
  /**
   * Get cache statistics
   * 
   * @returns Cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const stats = await this.adapter.getStats();
    return {
      hits: stats.hits,
      misses: stats.misses,
      size: stats.size,
      keyCount: stats.keyCount,
      memoryUsage: stats.size,
      lastUpdated: new Date(),
      keys: []
    };
  }
}