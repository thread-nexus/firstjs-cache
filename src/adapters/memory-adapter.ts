/**
 * @fileoverview In-memory storage adapter implementation with LRU caching
 */

import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { compressData, decompressData } from '../utils/compression-utils';
/**
 * Configuration options for the memory storage adapter
 */
export interface MemoryStorageOptions {
  maxSize?: number;       // Maximum cache size in bytes
  maxItems?: number;      // Maximum number of items
  defaultTtl?: number;    // Default TTL in seconds
  updateAgeOnGet?: boolean; // Whether to update item age on get
  allowStale?: boolean;   // Whether to return stale items
  maxEvictionAttempts?: number; // Maximum number of eviction attempts to prevent endless loops
}
/**
 * Cache entry metadata
 */
interface CacheEntryMetadata {
  tags: string[];
  createdAt: number;
  expiresAt?: number;
  size: number;
  compressed?: boolean;
  lastAccessed: number;
}
/**
 * Cache statistics interface
 */
export interface CacheStats {
  hits: number;
  misses: number;
  keyCount: number;
  size: number;
  maxSize: number;
  memoryUsage: number;
  lastUpdated: number;
  entries: number;
  avgTtl: number;
  maxTtl: number;
}

/**
 * Health status interface
 */
export interface HealthStatus {
  healthy: boolean;
  lastCheck: Date;
  message: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

/**
 * In-memory storage adapter using LRU cache
 */
// Import or define the ICacheProvider interface
import { ICacheProvider } from '../interfaces/cache-provider';

export class MemoryAdapter implements ICacheProvider {
  name = 'memory';
  private store = new Map<string, any>();
  private metadata: Map<string, CacheEntryMetadata> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0
  };
  private readonly maxSize: number;
  private readonly maxItems: number;
  private readonly defaultTtl: number;
  private readonly updateAgeOnGet: boolean;
  private readonly maxEvictionAttempts: number;
  
  /**
   * Create a new memory storage adapter
   */
  constructor(options: MemoryStorageOptions = {}) {
    this.maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB default
    this.maxItems = options.maxItems || 10000;
    this.defaultTtl = options.defaultTtl || 3600; // 1 hour default
    this.updateAgeOnGet = options.updateAgeOnGet !== false;
    this.maxEvictionAttempts = options.maxEvictionAttempts || 100; // Prevent endless loops
  }
  
  /**
   * Get a value from the cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const value = this.store.get(key);
      const meta = this.metadata.get(key);
      
      if (value === undefined) {
        this.stats.misses++;
        return null;
      }
  
      // Check expiration
      if (meta?.expiresAt && Date.now() > meta.expiresAt) {
        this.store.delete(key);
        this.metadata.delete(key);
        this.stats.misses++;
        return null;
  }
    
      this.stats.hits++;
      
      // Update last accessed time
      if (this.updateAgeOnGet && meta) {
        meta.lastAccessed = Date.now();
      }

      // Handle decompression if needed
      if (meta?.compressed && Buffer.isBuffer(value)) {
        try {
          const decompressed = await decompressData(value);
          if (typeof decompressed === 'string') {
            try {
              return JSON.parse(decompressed) as T;
            } catch (e) {
              // If parsing fails, return the string value
              return decompressed as unknown as T;
            }
          }
          return decompressed as unknown as T;
        } catch (e) {
          // If decompression fails, return the raw value
          return value as T;
        }
      }
      
      return value as T;
    } catch (error) {
      console.error(`Error getting cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Set a value in the cache
   */
  async set<T = any>(key: string, value: T, options?: {
    ttl?: number;
    tags?: string[];
    compression?: boolean;
    compressionThreshold?: number;
  }): Promise<void> {
    try {
      const ttl = options?.ttl !== undefined ? options.ttl : this.defaultTtl;
      
      let processedValue = value;
      let size: number;
      let compressed = false;
      
      // Handle compression if enabled
      if (options?.compression) {
        const threshold = options.compressionThreshold || 1024;
        
        // Only compress string values or objects that can be stringified
        if (typeof value === 'string' || (typeof value === 'object' && value !== null)) {
          try {
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            
            if (Buffer.byteLength(serialized, 'utf8') > threshold) {
              const compressedData = await compressData(serialized);
              processedValue = compressedData as unknown as T;
              compressed = true;
              size = Buffer.isBuffer(compressedData) ? compressedData.length : 0;
            } else {
              size = Buffer.byteLength(serialized, 'utf8');
            }
          } catch (e) {
            console.error('Compression error:', e);
            // Fallback to uncompressed
            size = this.calculateSize(value);
          }
        } else {
          size = this.calculateSize(value);
        }
      } else {
        size = this.calculateSize(value);
      }

      // Check if value exceeds maximum size
      if (size > this.maxSize) {
        throw new Error(`Value for key "${key}" exceeds maximum size (${size} > ${this.maxSize})`);
      }
      
      // Ensure we have space - evict if needed
      await this.ensureCapacity(size);
      
      // Store value in cache
      this.store.set(key, processedValue);
      
      // Update metadata
      this.metadata.set(key, {
        tags: options?.tags || [],
        createdAt: Date.now(),
        expiresAt: ttl > 0 ? Date.now() + (ttl * 1000) : undefined,
        size,
        compressed,
        lastAccessed: Date.now()
      });
      
      this.stats.sets++;
      this.stats.size = this.calculateTotalSize();
      
      // Emit event
      emitCacheEvent(CacheEventType.SET, {
        key,
        size,
        ttl
      });
    } catch (error) {
      console.error(`Error setting cache key ${key}:`, error);
      throw error;
    }
  }

  /**
   * Delete a value from the cache
   */
  async delete(key: string): Promise<boolean> {
    try {
      const existed = this.store.has(key);
      
      if (existed) {
        this.store.delete(key);
        this.metadata.delete(key);
        this.stats.deletes++;
        this.stats.size = this.calculateTotalSize();
        
        emitCacheEvent(CacheEventType.DELETE, { key });
      }
  
      return existed;
    } catch (error) {
      console.error(`Error deleting cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if a key exists in the cache
   */
  async has(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
  /**
   * Clear all values from the cache
   */
  async clear(): Promise<void> {
    try {
      const count = this.store.size;
      this.store.clear();
      this.metadata.clear();
      
      // Reset stats
      this.stats.size = 0;
      
      emitCacheEvent(CacheEventType.CLEAR, { entriesRemoved: count });
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get multiple values from the cache
   */
  async getMany<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    
    for (const key of keys) {
      result[key] = await this.get<T>(key);
    }
    
    return result;
  }

  /**
   * Set multiple values in the cache
   */
  async setMany<T = any>(entries: Record<string, T>, options?: {
    ttl?: number;
    tags?: string[];
    compression?: boolean;
    compressionThreshold?: number;
  }): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await this.set(key, value, options);
    }
  }

  /**
   * Invalidate cache entries by tag
   */
  async invalidateByTag(tag: string): Promise<void> {
    let count = 0;
    
    // Find keys with the specified tag
    const keysToInvalidate: string[] = [];
    for (const [key, meta] of this.metadata.entries()) {
      if (meta.tags.includes(tag)) {
        keysToInvalidate.push(key);
      }
    }
    
    // Delete each key
    for (const key of keysToInvalidate) {
      const deleted = await this.delete(key);
      if (deleted) count++;
    }
    
    emitCacheEvent(CacheEventType.INVALIDATE, {
      tag,
      entriesRemoved: count
    });
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    const totalTtl = Array.from(this.metadata.values())
      .map(meta => (meta.expiresAt ? meta.expiresAt - meta.createdAt : 0))
      .reduce((sum, ttl) => sum + ttl, 0);
    const avgTtl = this.metadata.size > 0 ? totalTtl / this.metadata.size : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keyCount: this.store.size,
      size: this.stats.size,
      maxSize: this.maxSize,
      memoryUsage: process.memoryUsage().heapUsed,
      lastUpdated: Date.now(),
      entries: this.store.size,
      avgTtl,
      maxTtl: this.defaultTtl
    };
  }

  /**
   * Get metadata for a key
   */
  async getMetadata(key: string): Promise<any | null> {
    return this.metadata.get(key) || null;
  }

  /**
   * Calculate the total size of all cache entries
   */
  private calculateTotalSize(): number {
    let size = 0;
    for (const meta of this.metadata.values()) {
      size += meta.size;
    }
    return size;
  }

  /**
   * Calculate size of a value
   */
  private calculateSize(value: any): number {
    if (value === null || value === undefined) {
      return 8;
    }
    
    if (typeof value === 'string') {
      return Buffer.byteLength(value, 'utf8');
    }
    
    if (typeof value === 'number' || typeof value === 'boolean') {
      return 8;
    }
    
    if (Buffer.isBuffer(value)) {
      return value.length;
    }
    
    try {
      const serialized = JSON.stringify(value);
      return Buffer.byteLength(serialized, 'utf8');
    } catch (e) {
      return 1024; // Default size if serialization fails
    }
  }

  /**
   * Ensure the cache has capacity for new items
   * @param requiredSize Size of the new item being added
   * @throws Error if unable to free enough space after maximum eviction attempts
   */
  private async ensureCapacity(requiredSize: number = 0): Promise<void> {
    let evictionAttempts = 0;
    
    // Check item count limit
    if (this.store.size >= this.maxItems) {
      await this.evictLRU();
      evictionAttempts++;
    }
    
    // Check size limit
    let initialSize = this.calculateTotalSize();
    let currentSize = initialSize;
    
    // If we need to free space for a new item
    const targetSize = this.maxSize - requiredSize;
    
    // If we already have enough space, return early
    if (currentSize <= targetSize) {
      return;
    }
    
    while (currentSize > targetSize && this.store.size > 0) {
      // Safety check to prevent endless loops
      if (evictionAttempts >= this.maxEvictionAttempts) {
        throw new Error(`Unable to free enough space after ${evictionAttempts} eviction attempts. Current size: ${currentSize}, Target size: ${targetSize}`);
      }
      
      await this.evictLRU();
      evictionAttempts++;
      
      // Recalculate size after eviction
      currentSize = this.calculateTotalSize();
      
      // If we've made no progress in freeing space, break to avoid infinite loop
      if (currentSize >= initialSize && evictionAttempts > 1) {
        throw new Error(`Unable to free space: size not decreasing after ${evictionAttempts} eviction attempts`);
      }
      
      // Update our reference point for the next iteration
      initialSize = currentSize;
    }
  }

  /**
   * Evict least recently used item
   * @returns The key that was evicted, or null if no items to evict
   */
  private async evictLRU(): Promise<string | null> {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    
    for (const [key, meta] of this.metadata.entries()) {
      if (meta.lastAccessed < oldestAccess) {
        oldestAccess = meta.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      await this.delete(oldestKey);
      
      emitCacheEvent(CacheEventType.EXPIRE, {
        key: oldestKey,
        reason: 'lru'
      });
      
      return oldestKey;
    }
    
    return null;
  }

  async healthCheck(): Promise<HealthStatus> {
    return {
      healthy: true,
      lastCheck: new Date(),
      message: 'Memory adapter operational',
      status: 'healthy' // Add the required 'status' property
    };
  }
}
