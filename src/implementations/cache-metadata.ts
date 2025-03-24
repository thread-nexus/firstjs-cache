/**
 * @fileoverview Cache metadata manager for tracking additional information about cache entries
 */

import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { EntryMetadata } from '../types/common';

/**
 * Metadata for a cache entry - compatible with EntryMetadata
 */
export interface CacheEntryMetadata {
  /**
   * Tags associated with the cache entry
   */
  tags: string[];
  
  /**
   * When the entry was created - stored as Date but convertible to timestamp
   */
  createdAt: Date;
  
  /**
   * When the entry was last updated
   */
  updatedAt: Date;
  
  /**
   * Number of times the entry has been accessed
   */
  accessCount: number;
  
  /**
   * Last time the entry was accessed
   */
  lastAccessed?: Date;
  
  /**
   * Time to live in seconds
   */
  ttl?: number;
  
  /**
   * Access history
   */
  accessHistory?: Date[];
  
  /**
   * Size of the entry in bytes (required by EntryMetadata)
   */
  size: number;
  
  /**
   * Additional custom metadata
   */
  [key: string]: any;
}

/**
 * Options for setting metadata
 */
export interface CacheMetadataOptions {
  /**
   * Tags to associate with the cache entry
   */
  tags?: string[];
  /**
   * Time to live in seconds
   */
  ttl?: number;
  /**
   * Size of the entry in bytes
   */
  size?: number;
  /**
   * Additional custom metadata
   */
  [key: string]: any;
}

/**
 * Cache metadata manager
 */
export class CacheMetadata {
  private metadata = new Map<string, CacheEntryMetadata>();
  /**
   * Create a new metadata entry
   * 
   * @param key - Cache key
   * @param tags - Tags to associate with the entry
   * @param options - Additional metadata options
   * @returns The created metadata entry
   */
  create(key: string, tags: string[] = [], options: CacheMetadataOptions = {}): CacheEntryMetadata {
    if (!key || typeof key !== 'string' || key.trim() === '') {
      throw new Error('Invalid cache key');
    }

    const now = new Date();
    const entry: CacheEntryMetadata = {
      tags: tags || [],
      createdAt: now,
      updatedAt: new Date(now.getTime() + 1), // Ensure updatedAt is greater than createdAt
      accessCount: 0,
      accessHistory: [],
      size: options.size || 0, // Ensure size property is set
      ...options
    };

    this.metadata.set(key, entry);
    
    // Add required properties to event payload
    emitCacheEvent(CacheEventType.METADATA_UPDATE, {
      key,
      metadata: entry,
      type: CacheEventType.METADATA_UPDATE.toString(),
      timestamp: Date.now()
    });

    return entry;
  }

  /**
   * Create multiple metadata entries at once
   * 
   * @param entries - Map of keys to metadata options
   * @returns Map of keys to created metadata entries
   */
  bulkCreate(entries: Record<string, { tags: string[], options?: CacheMetadataOptions }>): Record<string, CacheEntryMetadata> {
    const result: Record<string, CacheEntryMetadata> = {};
    
    for (const [key, { tags, options }] of Object.entries(entries)) {
      result[key] = this.create(key, tags, options);
    }
    
    return result;
  }

  /**
   * Set metadata for a cache key
   * 
   * @param key - Cache key
   * @param options - Metadata options
   */
  set(key: string, options: CacheMetadataOptions = {}): void {
    const now = new Date();
    const existingMetadata = this.metadata.get(key);
    
    if (existingMetadata) {
      // Update existing metadata
      const updatedMetadata = {
        ...existingMetadata,
        tags: options.tags || existingMetadata.tags,
        updatedAt: new Date(now.getTime() + 1), // Ensure updatedAt is greater than createdAt
        ...options
      };
      this.metadata.set(key, updatedMetadata);
    } else {
      // Create new metadata
      this.create(key, options.tags, options);
    }
  }

  /**
   * Update an existing metadata entry
   * 
   * @param key - Cache key
   * @param updates - Properties to update
   * @returns The updated metadata entry or undefined if not found
   */
  update(key: string, updates: Partial<CacheEntryMetadata>): CacheEntryMetadata | undefined {
    const entry = this.metadata.get(key);
    
    if (!entry) {
      throw new Error(`Metadata for key "${key}" not found`);
    }
    
    const updatedEntry = {
      ...entry,
      ...updates,
      updatedAt: new Date()
    };
    
    this.metadata.set(key, updatedEntry);
    
    // Add required properties to event payload
    emitCacheEvent(CacheEventType.METADATA_UPDATE, {
      key,
      metadata: updatedEntry,
      type: CacheEventType.METADATA_UPDATE.toString(),
      timestamp: Date.now()
    });
    
    return updatedEntry;
  }

  /**
   * Get metadata for a cache key
   * 
   * @param key - Cache key
   * @returns Metadata or undefined if not found
   * Convert CacheEntryMetadata to EntryMetadata for compatibility
   */
  get(key: string): EntryMetadata | undefined {
    const metadata = this.metadata.get(key);
    if (!metadata) return undefined;
    
    // Convert CacheEntryMetadata to EntryMetadata
    return {
      tags: metadata.tags,
      createdAt: metadata.createdAt.getTime(), // Convert Date to number
      lastAccessed: metadata.lastAccessed ? metadata.lastAccessed.getTime() : metadata.createdAt.getTime(),
      size: metadata.size,
      accessCount: metadata.accessCount,
      expiresAt: metadata.ttl ? metadata.createdAt.getTime() + (metadata.ttl * 1000) : undefined,
      compressed: metadata.compressed || false,
      // Include any other required properties
    };
  }

  /**
   * Delete metadata for a cache key
   * 
   * @param key - Cache key
   * @returns True if metadata was deleted, false if not found
   */
  delete(key: string): boolean {
    const deleted = this.metadata.delete(key);
    
    if (deleted) {
      // Add required properties to event payload
      emitCacheEvent(CacheEventType.METADATA_DELETE, { 
        key,
        type: CacheEventType.METADATA_DELETE.toString(),
        timestamp: Date.now() 
      });
    }
    
    return deleted;
  }

  /**
   * Clear all metadata
   */
  clear(): void {
    const count = this.metadata.size;
    this.metadata.clear();
    
    // Add required properties to event payload
    emitCacheEvent(CacheEventType.METADATA_CLEAR, { 
      count,
      type: CacheEventType.METADATA_CLEAR.toString(),
      timestamp: Date.now()
    });
  }

  /**
   * Record an access to a cache key
   * 
   * @param key - Cache key
   */
  recordAccess(key: string): void {
    const entry = this.metadata.get(key);
    
    if (entry) {
      entry.accessCount++;
      const now = new Date();
      entry.lastAccessed = now;
      
      // Track access history if available
      if (Array.isArray(entry.accessHistory)) {
        entry.accessHistory.push(now);
        
        // Limit history size
        if (entry.accessHistory.length > 10) {
          entry.accessHistory = entry.accessHistory.slice(-10);
        }
      } else {
        entry.accessHistory = [now];
      }
    }
  }

  /**
   * Get metadata entries by tag
   * 
   * @param tag - Tag to search for
   * @returns Array of matching entries with their keys
   */
  getByTag(tag: string): Array<{ key: string, metadata: CacheEntryMetadata }> {
    const result: Array<{ key: string, metadata: CacheEntryMetadata }> = [];
    
    for (const [key, meta] of this.metadata.entries()) {
      if (meta.tags.includes(tag)) {
        result.push({ key, metadata: meta });
      }
    }
    
    return result;
  }

  /**
   * Find cache keys by tag
   * 
   * @param tag - Tag to search for
   * @returns Array of matching keys
   */
  findByTag(tag: string): string[] {
    const result: string[] = [];
    
    for (const [key, meta] of this.metadata.entries()) {
      if (meta.tags.includes(tag)) {
        result.push(key);
      }
    }
    
    return result;
  }

  /**
   * Find cache keys by prefix
   * 
   * @param prefix - Key prefix to search for
   * @returns Array of matching keys
   */
  findByPrefix(prefix: string): string[] {
    const result: string[] = [];
    
    for (const key of this.metadata.keys()) {
      if (key.startsWith(prefix)) {
        result.push(key);
      }
    }
    
    return result;
  }

  /**
   * Find cache keys by pattern
   * 
   * @param pattern - Regular expression pattern to match keys
   * @returns Array of matching keys
   */
  findByPattern(pattern: string): string[] {
    const regex = new RegExp(pattern);
    const result: string[] = [];
    
    for (const key of this.metadata.keys()) {
      if (regex.test(key)) {
        result.push(key);
      }
    }
    
    return result;
  }

  /**
   * Check if a metadata entry is expired
   * 
   * @param key - Cache key
   * @returns True if expired, false otherwise
   */
  isExpired(key: string): boolean {
    const entry = this.metadata.get(key);
    
    if (!entry || !entry.ttl) {
      return false;
    }
    
    const expirationTime = entry.createdAt.getTime() + (entry.ttl * 1000);
    return Date.now() > expirationTime;
  }

  /**
   * Get access history for a key
   * 
   * @param key - Cache key
   * @returns Array of access timestamps or undefined if not found
   */
  getAccessHistory(key: string): Date[] | undefined {
    return this.metadata.get(key)?.accessHistory;
  }

  /**
   * Get all cache keys with metadata
   * 
   * @returns Array of all keys
   */
  keys(): string[] {
    return Array.from(this.metadata.keys());
  }

  /**
   * Get the number of metadata entries
   * 
   * @returns Number of entries
   */
  size(): number {
    return this.metadata.size;
  }

  /**
   * Get summary statistics about metadata
   * 
   * @returns Metadata statistics
   */
  getStats(): Record<string, any> {
    let totalAccesses = 0;
    let tagCounts: Record<string, number> = {};
    
    for (const meta of this.metadata.values()) {
      totalAccesses += meta.accessCount;
      
      // Count tag occurrences
      if (meta.tags) {
        for (const tag of meta.tags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }
    }
    
    // Calculate average TTL and age
    let totalTtl = 0;
    let ttlCount = 0;
    let totalAge = 0;
    const now = Date.now();
    
    for (const meta of this.metadata.values()) {
      if (meta.ttl) {
        totalTtl += meta.ttl;
        ttlCount++;
      }
      
      if (meta.createdAt) {
        totalAge += now - meta.createdAt.getTime();
      }
    }
    
    return {
      entryCount: this.metadata.size,
      totalAccesses,
      avgAccessesPerKey: this.metadata.size ? totalAccesses / this.metadata.size : 0,
      avgTtl: ttlCount ? totalTtl / ttlCount : 0,
      avgAge: this.metadata.size ? totalAge / this.metadata.size : 0,
      tagStats: {
        uniqueTags: Object.keys(tagCounts).length,
        tagCounts
      }
    };
  }
}