import { EntryMetadata } from '../types/common';

/**
 * Cache metadata manager
 */
export class CacheMetadata {
  private metadata: Map<string, EntryMetadata> = new Map();

  /**
   * Clear all metadata
   */
  clear(): void {
    this.metadata.clear();
  }

  /**
   * Delete metadata for a cache key
   * 
   * @param key - The cache key
   * @returns True if metadata was deleted, false otherwise
   */
  delete(key: string): boolean {
    return this.metadata.delete(key);
  }

  /**
   * Find keys by tag
   * 
   * @param tag - Tag to search for
   * @returns Array of keys with the specified tag
   */
  findByTag(tag: string): string[] {
    const result: string[] = [];
    
    this.metadata.forEach((data, key) => {
      if (data.tags.includes(tag)) {
        result.push(key);
      }
    });
    
    return result;
  }

  /**
   * Find keys by prefix
   * 
   * @param prefix - Prefix to search for
   * @returns Array of keys with the specified prefix
   */
  findByPrefix(prefix: string): string[] {
    const result: string[] = [];
    
    this.metadata.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        result.push(key);
      }
    });
    
    return result;
  }

  /**
   * Find keys by pattern
   * 
   * @param pattern - Pattern to match against keys
   * @returns Array of keys matching the pattern
   */
  findByPattern(pattern: string): string[] {
    try {
      const regex = new RegExp(pattern);
      const result: string[] = [];
      
      this.metadata.forEach((_, key) => {
        if (regex.test(key)) {
          result.push(key);
        }
      });
      
      return result;
    } catch (error) {
      // If the pattern is not a valid regex, treat it as a literal string
      return this.findByPrefix(pattern);
    }
  }

  /**
   * Get metadata for a cache key
   * 
   * @param key - The cache key
   * @returns Metadata for the key or undefined if not found
   */
  get(key: string): EntryMetadata | undefined {
    return this.metadata.get(key);
  }

  /**
   * Set metadata for a cache key
   * 
   * @param key - The cache key
   * @param data - Metadata to store
   */
  set(key: string, data: Partial<EntryMetadata>): void {
    const existing = this.metadata.get(key);
    
    if (existing) {
      this.metadata.set(key, {
        ...existing,
        ...data,
        updatedAt: new Date()
      });
    } else {
      this.metadata.set(key, {
        createdAt: new Date(),
        updatedAt: new Date(),
        accessCount: 0,
        tags: [],
        ...data
      });
    }
  }

  /**
   * Update access count for a key
   * 
   * @param key - The cache key
   */
  recordAccess(key: string): void {
    const metadata = this.metadata.get(key);
    
    if (metadata) {
      metadata.accessCount += 1;
      metadata.updatedAt = new Date();
    }
  }

  /**
   * Get all keys
   * 
   * @returns Array of all keys
   */
  keys(): string[] {
    return Array.from(this.metadata.keys());
  }

  /**
   * Get the number of entries
   * 
   * @returns Number of entries
   */
  size(): number {
    return this.metadata.size;
  }
}