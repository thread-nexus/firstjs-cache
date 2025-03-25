/**
 * @fileoverview In-memory cache provider implementation
 */

import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { CacheOptions, CacheStats } from '../types';
import { EntryMetadata } from '../types';
import { HealthStatus } from '../types';

/**
 * Cache entry with metadata
 */
interface CacheEntry<T = any> {
  /**
   * The stored value
   */
  value: T;
  
  /**
   * When the entry expires
   */
  expiresAt: number;
  
  /**
   * Metadata about the entry
   */
  metadata: EntryMetadata;
}

/**
 * In-memory cache provider
 */
export class MemoryProvider implements ICacheProvider {
  /**
   * Cache store
   */
  private cache = new Map<string, CacheEntry>();
  
  /**
   * Provider name
   */
  public name: string = 'memory';
  
  /**
   * Statistics
   */
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    keyCount: 0,
    memoryUsage: 0,
    lastUpdated: Date.now()
  };
  
  /**
   * Cleanup timer
   */
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  /**
   * Constructor
   */
  constructor(options: { ttl?: number; cleanupInterval?: number } = {}) {
    const cleanupInterval = options.cleanupInterval || 60 * 1000; // 1 minute
    
    // Start cleanup timer
    this.cleanupTimer = setInterval(() => this.cleanup(), cleanupInterval);
  }
  
  /**
   * Get a value from cache
   */
  async get<T = any>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.stats.lastUpdated = Date.now();
      
      emitCacheEvent(
        CacheEventType.GET_MISS,
        { key, provider: this.name }
      );
      
      return null;
    }
    
    // Check if expired
    if (entry.expiresAt !== 0 && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      this.stats.lastUpdated = Date.now();
      
      emitCacheEvent(
        CacheEventType.GET_MISS,
        { key, provider: this.name, reason: 'expired' }
      );
      
      return null;
    }
    
    // Update metadata
    entry.metadata.accessCount = (entry.metadata.accessCount || 0) + 1;
    entry.metadata.updatedAt = Date.now();
    
    this.stats.hits++;
    this.stats.lastUpdated = Date.now();
    
    emitCacheEvent(
      CacheEventType.GET_HIT,
      { key, provider: this.name, size: entry.metadata.size }
    );
    
    return entry.value as T;
  }
  
  /**
   * Set a value in cache
   */
  async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl !== undefined ? options.ttl * 1000 : 0; // Convert to ms
    const now = Date.now();
    const expiresAt = ttl > 0 ? now + ttl : 0;
    
    const metadata: EntryMetadata = {
      createdAt: now,
      updatedAt: now,
      lastAccessed: now, // added required property
      accessCount: 0,
      tags: options.tags || [],
      size: 0,
      compressed: false
    };
    
    try {
      // Calculate size if it's a string or Buffer
      if (typeof value === 'string') {
        metadata.size = Buffer.byteLength(value, 'utf8');
      } else if (Buffer.isBuffer(value)) {
        metadata.size = value.length;
      } else {
        const serialized = JSON.stringify(value);
        metadata.size = Buffer.byteLength(serialized, 'utf8');
      }
    } catch (error) {
      // Ignore size calculation errors
      console.error('Error calculating size:', error);
    }
    
    this.cache.set(key, {
      value,
      expiresAt,
      metadata
    });
    
    this.updateStats();
    
    emitCacheEvent(
      CacheEventType.SET,
      { key, provider: this.name, size: metadata.size, ttl: options.ttl }
    );
  }
  
  /**
   * Delete a value from cache
   */
  async delete(key: string): Promise<boolean> {
    const result = this.cache.delete(key);
    
    if (result) {
      this.updateStats();
      
      emitCacheEvent(
        CacheEventType.DELETE,
        { key, provider: this.name }
      );
    }
    
    return result;
  }
  
  /**
   * Clear the entire cache
   */
  async clear(): Promise<void> {
    const keyCount = this.cache.size;
    this.cache.clear();
    this.updateStats();
    
    emitCacheEvent(
      CacheEventType.CLEAR,
      { provider: this.name, entriesRemoved: keyCount }
    );
  }
  
  /**
   * Check if a key exists in cache
   */
  async has(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    // Check if expired
    if (entry.expiresAt !== 0 && entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Get multiple values from cache
   */
  async getMany<T = any>(keys: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    let hits = 0;
    let misses = 0;
    
    for (const key of keys) {
      const value = await this.get<T>(key);
      if (value !== null) {
        result.set(key, value);
        hits++;
      } else {
        misses++;
      }
    }
    
    emitCacheEvent(
      CacheEventType.GET_MANY,
      { keys, hits, misses, provider: this.name }
    );
    
    return result;
  }
  
  /**
   * Set multiple values in cache
   */
  async setMany<T = any>(entries: Map<string, T>, options: CacheOptions = {}): Promise<void> {
    const keys: string[] = [];
    
    for (const [key, value] of entries.entries()) {
      await this.set(key, value, options);
      keys.push(key);
    }
    
    emitCacheEvent(
      CacheEventType.SET_MANY,
      { keys, provider: this.name }
    );
  }
  
  /**
   * Delete multiple values from cache
   */
  async deleteMany(keys: string[]): Promise<number> {
    let deleted = 0;
    
    for (const key of keys) {
      if (await this.delete(key)) {
        deleted++;
      }
    }
    
    return deleted;
  }
  
  /**
   * Get all keys in cache
   */
  async keys(pattern?: string): Promise<string[]> {
    const keys = Array.from(this.cache.keys());
    
    if (!pattern) {
      return keys;
    }
    
    try {
      const regex = new RegExp(pattern);
      return keys.filter(key => regex.test(key));
    } catch (error) {
      // If not a valid regex, treat as prefix
      return keys.filter(key => key.startsWith(pattern));
    }
  }
  
  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    this.updateStats();
    return { ...this.stats };
  }
  
  /**
   * Get health status
   */
  async healthCheck(): Promise<HealthStatus> {
    const memStats = process.memoryUsage ? process.memoryUsage() : { heapUsed: 0, heapTotal: 0 };
    
    return {
      status: 'healthy',
      healthy: true,
      timestamp: Date.now(),
      lastCheck: Date.now(),
      details: {
        entryCount: this.cache.size,
        memoryUsage: memStats.heapUsed,
        memoryTotal: memStats.heapTotal
      }
    };
  }
  
  /**
   * Get metadata for a key
   */
  async getMetadata(key: string): Promise<EntryMetadata | null> {
    const entry = this.cache.get(key);
    return entry ? { ...entry.metadata } : null;
  }
  
  /**
   * Invalidate entries by tag
   */
  async invalidateByTag(tag: string): Promise<number> {
    let count = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata.tags?.includes(tag)) {
        this.cache.delete(key);
        count++;
      }
    }
    
    if (count > 0) {
      this.updateStats();
      
      emitCacheEvent(
        CacheEventType.INVALIDATE,
        { tag, provider: this.name, entriesRemoved: count }
      );
    }
    
    return count;
  }
  
  /**
   * Get TTL for a key
   */
  async getTtl(key: string): Promise<number | null> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // If no expiration
    if (entry.expiresAt === 0) {
      return 0;
    }
    
    const ttl = Math.max(0, entry.expiresAt - Date.now());
    return Math.ceil(ttl / 1000); // Convert to seconds
  }
  
  /**
   * Set TTL for a key
   */
  async setTtl(key: string, ttl: number): Promise<boolean> {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    // Update expiration
    entry.expiresAt = ttl > 0 ? Date.now() + (ttl * 1000) : 0;
    entry.metadata.updatedAt = Date.now();
    
    emitCacheEvent(
      CacheEventType.SET,
      { key, provider: this.name, ttl }
    );
    
    return true;
  }
  
  /**
   * Dispose of the provider
   */
  async dispose(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.cache.clear();
    this.updateStats();
  }
  
  /**
   * Update statistics
   */
  private updateStats(): void {
    let size = 0;
    for (const entry of this.cache.values()) {
      size += entry.metadata.size || 0;
    }
    
    this.stats.size = size;
    this.stats.keyCount = this.cache.size;
    
    // Get memory usage if available
    try {
      if (typeof process !== 'undefined' && process.memoryUsage) {
        const usage = process.memoryUsage();
        this.stats.memoryUsage = usage.heapUsed;
      }
    } catch (error) {
      // Ignore memory usage errors
    }
    
    this.stats.lastUpdated = Date.now();
  }
  
  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let expired = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt !== 0 && entry.expiresAt < now) {
        this.cache.delete(key);
        expired++;
        
        emitCacheEvent(
          CacheEventType.EXPIRED,
          { key, provider: this.name }
        );
      }
    }
    
    if (expired > 0) {
      this.updateStats();
    }
  }
}
