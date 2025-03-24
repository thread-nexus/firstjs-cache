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
 * In-memory storage adapter using LRU cache
 */
export class MemoryStorageAdapter {
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
  
  /**
   * Create a new memory storage adapter
   */
  constructor(options: MemoryStorageOptions = {}) {
    this.maxSize = options.maxSize || 100 * 1024 * 1024; // 100MB default
    this.maxItems = options.maxItems || 10000;
    this.defaultTtl = options.defaultTtl || 3600; // 1 hour default
    this.updateAgeOnGet = options.updateAgeOnGet !== false;
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
          const decompressed = await decompressData(value, 'utf8');
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
      
      // Ensure we have space - evict if needed
      this.ensureCapacity();
      
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
              processedValue = compressedData;
              compressed = true;
              size = compressedData.length;
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
  async invalidateByTag(tag: string): Promise<number> {
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
    
    return count;
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    hits: number;
    misses: number;
    keyCount: number;
    size: number;
    maxSize: number;
  }> {
    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      keyCount: this.store.size,
      size: this.stats.size,
      maxSize: this.maxSize
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
   */
  private ensureCapacity(): void {
    // Check item count limit
    if (this.store.size >= this.maxItems) {
      this.evictLRU();
    }
    
    // Check size limit
    while (this.calculateTotalSize() >= this.maxSize && this.store.size > 0) {
      this.evictLRU();
    }
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;
    
    for (const [key, meta] of this.metadata.entries()) {
      if (meta.lastAccessed < oldestAccess) {
        oldestAccess = meta.lastAccessed;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey).then(r => {});
      
      emitCacheEvent(CacheEventType.EXPIRE, {
        key: oldestKey,
        reason: 'lru'
      });
    }
  }
}