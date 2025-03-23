/**
 * @fileoverview Browser localStorage adapter with size management and expiration
 */

import { IStorageAdapter, StorageAdapterConfig } from '../interfaces/storage-adapter';
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { handleCacheError } from '../utils/error-utils';

interface StorageEntry {
  value: string;
  expiresAt?: number;
  size: number;
  createdAt: number;
}

export class LocalStorageAdapter implements IStorageAdapter {
  private readonly prefix: string;
  private readonly maxSize: number;
  private currentSize: number = 0;

  constructor(config: StorageAdapterConfig & { maxSize?: number } = {}) {
    this.prefix = config.prefix || 'cache';
    this.maxSize = config.maxSize || 5 * 1024 * 1024; // 5MB default
    this.initializeSize();
  }

  /**
   * Initialize size tracking
   */
  private initializeSize(): void {
    try {
      let totalSize = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(this.prefix)) {
          const entry = this.getEntry(key);
          if (entry) {
            totalSize += entry.size;
          }
        }
      }
      this.currentSize = totalSize;
    } catch (error) {
      handleCacheError(error, {
        operation: 'initialize',
        provider: 'localStorage'
      });
    }
  }

  /**
   * Get value from localStorage
   */
  async get(key: string): Promise<string | null> {
    try {
      const entry = this.getEntry(this.getKeyWithPrefix(key));
      
      if (!entry) {
        new emitCacheEvent(CacheEventType.GET_MISS, {
          key,
          provider: 'localStorage'
        });
        return null;
      }

      // Check expiration
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        await this.delete(key);
        return null;
      }

      new emitCacheEvent(CacheEventType.GET_HIT, {
        key,
        provider: 'localStorage',
        age: Date.now() - entry.createdAt
      });

      return entry.value;
    } catch (error) {
      handleCacheError(error, {
        operation: 'get',
        key,
        provider: 'localStorage'
      });
      return null;
    }
  }

  /**
   * Set value in localStorage
   */
  async set(key: string, value: string, ttl?: number): Promise<void> {
    try {
      const size = this.getSize(value);
      
      // Ensure space is available
      if (size > this.maxSize) {
        throw new Error('Value exceeds maximum storage size');
      }

      // Make space if needed
      await this.ensureSpace(size);

      const entry: StorageEntry = {
        value,
        size,
        createdAt: Date.now(),
        expiresAt: ttl ? Date.now() + (ttl * 1000) : undefined
      };

      const prefixedKey = this.getKeyWithPrefix(key);
      const oldEntry = this.getEntry(prefixedKey);
      
      if (oldEntry) {
        this.currentSize -= oldEntry.size;
      }

      localStorage.setItem(prefixedKey, JSON.stringify(entry));
      this.currentSize += size;

      emitCacheEvent(CacheEventType.SET, {
        key,
        provider: 'localStorage',
        size
      });
    } catch (error) {
      handleCacheError(error, {
        operation: 'set',
        key,
        provider: 'localStorage'
      });
      throw error;
    }
  }

  /**
   * Check if key exists in localStorage
   */
  async has(key: string): Promise<boolean> {
    try {
      const entry = this.getEntry(this.getKeyWithPrefix(key));
      
      if (!entry) {
        return false;
      }

      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        await this.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      handleCacheError(error, {
        operation: 'has',
        key,
        provider: 'localStorage'
      });
      return false;
    }
  }

  /**
   * Delete value from localStorage
   */
  async delete(key: string): Promise<boolean> {
    try {
      const prefixedKey = this.getKeyWithPrefix(key);
      const entry = this.getEntry(prefixedKey);
      
      if (!entry) {
        return false;
      }

      localStorage.removeItem(prefixedKey);
      this.currentSize -= entry.size;

      emitCacheEvent(CacheEventType.DELETE, {
        key,
        provider: 'localStorage'
      });

      return true;
    } catch (error) {
      handleCacheError(error, {
        operation: 'delete',
        key,
        provider: 'localStorage'
      });
      return false;
    }
  }

  /**
   * Clear all values with prefix
   */
  async clear(): Promise<void> {
    try {
      const keys = this.getAllKeys();
      
      keys.forEach(key => {
        localStorage.removeItem(key);
      });

      this.currentSize = 0;

      emitCacheEvent(CacheEventType.CLEAR, {
        provider: 'localStorage',
        clearedKeys: keys.length
      });
    } catch (error) {
      handleCacheError(error, {
        operation: 'clear',
        provider: 'localStorage'
      });
      throw error;
    }
  }

  /**
   * Get matching keys
   */
  async keys(pattern?: string): Promise<string[]> {
    try {
      const keys = this.getAllKeys();
      
      if (!pattern) {
        return keys.map(key => this.removePrefix(key));
      }

      const regex = new RegExp(pattern.replace('*', '.*'));
      return keys
        .filter(key => regex.test(this.removePrefix(key)))
        .map(key => this.removePrefix(key));
    } catch (error) {
      handleCacheError(error, {
        operation: 'keys',
        pattern,
        provider: 'localStorage'
      });
      throw error;
    }
  }

  /**
   * Get multiple values
   */
  async getMany(keys: string[]): Promise<Record<string, string | null>> {
    const result: Record<string, string | null> = {};
    
    for (const key of keys) {
      result[key] = await this.get(key);
    }
    
    return result;
  }

  /**
   * Set multiple values
   */
  async setMany(entries: Record<string, string>, ttl?: number): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await this.set(key, value, ttl);
    }
  }

  private getKeyWithPrefix(key: string): string {
    return `${this.prefix}:${key}`;
  }

  private removePrefix(key: string): string {
    return key.slice(this.prefix.length + 1);
  }

  private getSize(value: string): number {
    return new Blob([value]).size;
  }

  private getEntry(key: string): StorageEntry | null {
    const data = localStorage.getItem(key);
    if (!data) return null;

    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }

  private getAllKeys(): string[] {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Ensure enough space is available
   */
  private async ensureSpace(requiredSize: number): Promise<void> {
    if (this.currentSize + requiredSize <= this.maxSize) {
      return;
    }

    // Get all entries sorted by creation time
    const entries = this.getAllKeys()
      .map(key => ({
        key,
        entry: this.getEntry(key)!
      }))
      .filter(({ entry }) => entry)
      .sort((a, b) => a.entry.createdAt - b.entry.createdAt);

    // Remove oldest entries until we have enough space
    for (const { key } of entries) {
      if (this.currentSize + requiredSize <= this.maxSize) {
        break;
      }
      await this.delete(this.removePrefix(key));
    }

    if (this.currentSize + requiredSize > this.maxSize) {
      throw new Error('Unable to free enough space');
    }
  }
}