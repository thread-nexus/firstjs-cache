/**
 * @fileoverview Advanced metadata management for cache entries with
 * tag-based operations and efficient lookups.
 */

import { EntryMetadata } from '../types/common';
import { emitCacheEvent, CacheEventType } from '../events/cache-events';
import { createKeyPattern } from './cache-manager-utils';

interface MetadataEntry extends EntryMetadata {
  key: string;
  expiresAt?: number;
}

export class CacheMetadataManager {
  // Primary metadata storage
  private metadata = new Map<string, MetadataEntry>();
  
  // Index for tag-based lookups
  private tagIndex = new Map<string, Set<string>>();
  
  // LRU tracking
  private accessOrder: string[] = [];
  private readonly maxAccessHistory = 1000;

  /**
   * Set metadata for a cache entry
   */
  set(key: string, data: Partial<EntryMetadata>): void {
    const now = new Date();
    const existing = this.metadata.get(key);

    const entry: MetadataEntry = {
      key,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      accessCount: existing?.accessCount || 0,
      tags: [...(existing?.tags || []), ...(data.tags || [])],
      computeTime: data.computeTime,
      refreshedAt: data.refreshedAt,
      ...data
    };

    // Update metadata
    this.metadata.set(key, entry);

    // Update tag index
    entry.tags.forEach(tag => {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    });

    emitCacheEvent(CacheEventType.METADATA_UPDATE, {
      key,
      metadata: entry
    });
  }

  /**
   * Get metadata for a cache entry
   */
  get(key: string): EntryMetadata | undefined {
    const entry = this.metadata.get(key);
    if (!entry) return undefined;

    // Check expiration
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.delete(key);
      return undefined;
    }

    return { ...entry };
  }

  /**
   * Record access to a cache entry
   */
  recordAccess(key: string): void {
    const entry = this.metadata.get(key);
    if (!entry) return;

    // Update access stats
    entry.accessCount++;
    entry.updatedAt = new Date();

    // Update LRU tracking
    this.accessOrder = [
      key,
      ...this.accessOrder.filter(k => k !== key)
    ].slice(0, this.maxAccessHistory);
  }

  /**
   * Delete metadata for a cache entry
   */
  delete(key: string): boolean {
    const entry = this.metadata.get(key);
    if (!entry) return false;

    // Remove from tag index
    entry.tags.forEach(tag => {
      const tagSet = this.tagIndex.get(tag);
      if (tagSet) {
        tagSet.delete(key);
        if (tagSet.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    });

    // Remove from metadata and access order
    this.metadata.delete(key);
    this.accessOrder = this.accessOrder.filter(k => k !== key);

    emitCacheEvent(CacheEventType.METADATA_DELETE, { 
      key,
      metadata: entry
    });
    return true;
  }

  /**
   * Find keys by tag
   */
  findByTag(tag: string): string[] {
    return Array.from(this.tagIndex.get(tag) || []);
  }

  /**
   * Find keys by pattern
   */
  findByPattern(pattern: string): string[] {
    try {
      const regex = new RegExp(pattern);
      return Array.from(this.metadata.keys()).filter(key => regex.test(key));
    } catch (error) {
      // If pattern is not a valid regex, treat it as a prefix
      return this.findByPrefix(pattern);
    }
  }

  /**
   * Find keys by prefix
   */
  findByPrefix(prefix: string): string[] {
    return Array.from(this.metadata.keys())
      .filter(key => key.startsWith(prefix));
  }

  /**
   * Get all cache keys
   */
  keys(): string[] {
    return Array.from(this.metadata.keys());
  }

  /**
   * Get recently accessed keys
   */
  getRecentlyAccessed(limit: number = 10): string[] {
    return this.accessOrder.slice(0, limit);
  }

  /**
   * Get metadata statistics
   */
  getStats(): {
    totalEntries: number;
    tagCount: number;
    averageAccessCount: number;
    recentlyAccessed: number;
    tags: string[];
    mostAccessedKeys: Array<{
      key: string;
      accessCount: number;
    }>;
  } {
    let totalAccess = 0;
    const keyAccessCounts: Array<{ key: string; accessCount: number }> = [];

    this.metadata.forEach((entry, key) => {
      totalAccess += entry.accessCount;
      keyAccessCounts.push({
        key,
        accessCount: entry.accessCount
      });
    });

    // Sort by access count descending
    keyAccessCounts.sort((a, b) => b.accessCount - a.accessCount);

    return {
      totalEntries: this.metadata.size,
      tagCount: this.tagIndex.size,
      averageAccessCount: totalAccess / Math.max(1, this.metadata.size),
      recentlyAccessed: this.accessOrder.length,
      tags: Array.from(this.tagIndex.keys()),
      mostAccessedKeys: keyAccessCounts.slice(0, 10)
    };
  }

  /**
   * Clear all metadata
   */
  clear(): void {
    const stats = this.getStats();
    this.metadata.clear();
    this.tagIndex.clear();
    this.accessOrder = [];

    emitCacheEvent(CacheEventType.METADATA_CLEAR, {
      stats,
      message: 'All metadata cleared'
    });
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    const expiredEntries: MetadataEntry[] = [];

    this.metadata.forEach((entry, key) => {
      if (entry.expiresAt && entry.expiresAt < now) {
        expiredEntries.push(entry);
        this.delete(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      emitCacheEvent(CacheEventType.CLEANUP, {
        entriesRemoved: cleaned,
        expiredEntries: expiredEntries.map(entry => ({
          key: entry.key,
          tags: entry.tags,
          createdAt: entry.createdAt,
          expiresAt: entry.expiresAt
        }))
      });
    }

    return cleaned;
  }
}