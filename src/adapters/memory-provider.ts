/**
 * @fileoverview Memory cache provider implementation
 */

// Update the import path to the correct location or ensure the file exists
import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheOptions, CacheStats, HealthStatus } from '../types/common';
import { MemoryStorageAdapter } from './memory-adapter';
import { IStorageAdapter } from '../interfaces/i-storage-adapter';

/**
 * Memory cache provider implementation
 */
export class MemoryProvider implements ICacheProvider {
  private adapter: MemoryStorageAdapter;
  readonly name = 'memory';
  private stats: CacheStats;

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
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0,
      avgTtl: 0,
      maxTtl: 0,
      keyCount: 0,
      memoryUsage: 0,
      lastUpdated: Date.now(),
      hitRatio: 0
    };
  }
  
  private async updateStats(hit: boolean) {
    const stats = await this.adapter.getStats();
    this.stats = {
      ...this.stats,
      hits: hit ? this.stats.hits + 1 : this.stats.hits,
      misses: hit ? this.stats.misses : this.stats.misses + 1,
      size: stats.size || 0,
      entries: stats.size || 0,
      keyCount: stats.size || 0,
      memoryUsage: stats.memoryUsage || 0,
      lastUpdated: Date.now(),
      hitRatio: (this.stats.hits / (this.stats.hits + this.stats.misses)) || 0
    };
  }

  /**
   * Get a value from the cache
   * 
   * @param key - Cache key
   * @returns Cached value or null if not found
   */
  async get<T = any>(key: string): Promise<T | null> {
    const value = await this.adapter.get<T>(key);
    this.updateStats(value !== null);
    return value;
  }
  
  /**
   * Set a value in the cache
   * 
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options
   */
  async set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> {
    // Create a compatible options object without tags
    const entryOptions: { ttl?: number } = {
      ttl: options?.ttl
    };

    // Handle tags separately if needed
    if (options?.tags && this.adapter.setMetadata) {
      await this.adapter.setMetadata(key, { tags: options.tags });
    }

    await this.adapter.set(key, value, entryOptions);
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
    return this.stats;
  }

  /**
   * Perform a health check
   * 
   * @returns Health status
   */
  async healthCheck(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      healthy: true, // Ensure this is always a boolean, not undefined
      details: {
        size: this.stats.size || 0,
        memoryUsage: process.memoryUsage().heapUsed
      }
    };
  }

  async getMany<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    return this.adapter.getMany<T>(keys);
  }

  async setMany<T = any>(entries: Record<string, T>, options?: CacheOptions): Promise<void> {
    return this.adapter.setMany(entries, options);
  }

  async has(key: string): Promise<boolean> {
    return this.adapter.has(key);
  }

  async invalidateByPrefix(prefix: string): Promise<void> {
    const keys = await this.adapter.keys();
    const toDelete = keys.filter(key => key.startsWith(prefix));
    await Promise.all(toDelete.map(key => this.delete(key)));
  }

  async invalidateByTag(tag: string): Promise<number> {
    const keys = await this.adapter.keys();
    const toDelete: string[] = [];

    for (const key of keys) {
      const metadata = await this.adapter.getMetadata(key);
      if (metadata?.tags.includes(tag)) {
        toDelete.push(key);
      }
    }

    await Promise.all(toDelete.map(key => this.delete(key)));
    return toDelete.length;
  }
}