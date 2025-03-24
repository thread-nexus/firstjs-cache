/**
 * @fileoverview In-memory storage adapter implementation with LRU caching
 */

import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { compressData, decompressData } from '../utils/compression-utils';
import { IStorageAdapter } from '../interfaces/i-storage-adapter';
import { HealthStatus, CompressionResult } from '../types/index';

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
  accessCount: number;
}

/**
 * In-memory storage adapter using LRU cache
 */
export class MemoryStorageAdapter implements IStorageAdapter {
  private storage: Map<string, any>;
  private metadata: Map<string, CacheEntryMetadata>;
  private config: any;
  public readonly name: string = 'memory';
  
  constructor(config?: any) {
    this.storage = new Map();
    this.metadata = new Map();
    this.config = config || {};
  }

  private emit(event: CacheEventType, payload: any) {
    emitCacheEvent(event, {
      provider: 'memory',
      ...payload
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const value = this.storage.get(key);
    if (!value) {
      this.emit(CacheEventType.GET_MISS, { key });
      return null;
    }
    
    this.emit(CacheEventType.GET_HIT, { key });
    
    if (value.compressed) {
      try {
        const decompressed = await decompressData(value.data, value.algorithm);
        return decompressed as T;
      } catch (e) {
        return null;
      }
    }
    return value as T;
  }

  async set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void> {
    let processedValue: any = value;
    let size = 0;

    if (this.config.compression) {
      try {
        const serialized = JSON.stringify(value);
        const compressedData = await compressData(Buffer.from(serialized));
        if (compressedData.compressed) {
          size = compressedData.data.length;
          processedValue = {
            data: compressedData.data,
            algorithm: compressedData.algorithm,
            compressed: true
          };
        }
      } catch (e) {
        // If compression fails, use the original value
        processedValue = value;
      }
    }

    const metadata: CacheEntryMetadata = {
      tags: [],
      createdAt: Date.now(),
      size: size || this.calculateSize(value),
      lastAccessed: Date.now(),
      accessCount: 0,
      compressed: !!this.config.compression
    };

    if (options?.ttl) {
      metadata.expiresAt = Date.now() + (options.ttl * 1000);
    }

    this.storage.set(key, processedValue);
    this.metadata.set(key, metadata);
    this.emit(CacheEventType.SET, { key, size: metadata.size });
  }

  private calculateSize(value: any): number {
    if (value === null || value === undefined) {
      return 8;
    }
    
    if (typeof value === 'string') {
      return Buffer.byteLength(value, 'utf8');
    }
    
    try {
      const serialized = JSON.stringify(value);
      return Buffer.byteLength(serialized, 'utf8');
    } catch (e) {
      return 100; // Default size
    }
  }

  async getMetadata(key: string): Promise<CacheEntryMetadata | null> {
    return this.metadata.get(key) || null;
  }

  async setMetadata(key: string, metadata: Partial<CacheEntryMetadata>): Promise<void> {
    const existing = await this.getMetadata(key);
    if (existing) {
      this.metadata.set(key, { ...existing, ...metadata });
    }
  }

  async getMany<T>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    for (const key of keys) {
      result[key] = await this.get<T>(key);
    }
    return result;
  }

  async setMany<T>(entries: Record<string, T>, options?: { ttl?: number }): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await this.set(key, value, options);
    }
  }

  async delete(key: string): Promise<boolean> {
    const exists = this.storage.has(key);
    if (exists) {
      this.storage.delete(key);
      this.metadata.delete(key);
      this.emit(CacheEventType.DELETE, { key });
    }
    return exists;
  }

  async clear(): Promise<void> {
    this.storage.clear();
    this.metadata.clear();
    this.emit(CacheEventType.CLEAR, {});
  }

  async has(key: string): Promise<boolean> {
    const meta = this.metadata.get(key);
    const exists = this.storage.has(key);
    
    // Check if expired
    if (exists && meta?.expiresAt && Date.now() > meta.expiresAt) {
      await this.delete(key);
      return false;
    }
    
    return exists;
  }

  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.storage.keys());
    
    if (!pattern) {
      return allKeys;
    }
    
    const regex = new RegExp(pattern.replace('*', '.*'));
    return allKeys.filter(key => regex.test(key));
  }

  async getStats(): Promise<Record<string, any>> {
    let totalSize = 0;
    for (const meta of this.metadata.values()) {
      totalSize += meta.size;
    }
    
    return {
      size: this.storage.size,
      memoryUsage: process.memoryUsage().heapUsed,
      keys: await this.keys(),
      totalSize
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    try {
      // Get current stats for the health check
      const statsData = await this.getStats();
      
      return {
        status: 'healthy',
        healthy: true, // Add the required healthy property
        details: {
          size: typeof statsData === 'object' ? statsData.size || 0 : 0,
          memoryUsage: typeof statsData === 'object' ? statsData.memoryUsage || 0 : 0
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        healthy: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
}

export const MemoryAdapter = MemoryStorageAdapter;