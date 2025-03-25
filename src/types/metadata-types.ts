/**
 * @fileoverview Metadata types for the cache system
 */

/**
 * Metadata for a cache entry
 */
export interface EntryMetadata {
  /**
   * When the entry was first created
   */
  createdAt: number;
  
  /**
   * When the entry was last updated
   */
  updatedAt: number;
  
  /**
   * Number of times the entry has been accessed
   */
  accessCount: number;
  
  /**
   * Tags associated with this entry
   */
  tags: string[];
  
  /**
   * Time taken to compute the value (if applicable)
   */
  computeTime?: number;
  
  /**
   * When the entry was last refreshed
   */
  refreshedAt?: number;
  
  /**
   * When the entry expires
   */
  expiresAt?: number;
  
  /**
   * Size of the entry in bytes
   */
  size?: number;
  
  /**
   * Whether the entry is compressed
   */
  compressed?: boolean;
  
  /**
   * Original size before compression
   */
  originalSize?: number;
  
  /**
   * Layer where the entry is stored
   */
  layer?: string;
  
  /**
   * Custom metadata
   */
  [key: string]: any;
}

/**
 * Metadata collection for all cache entries
 */
export interface CacheMetadataCollection {
  /**
   * Map of keys to metadata
   */
  entries: Map<string, EntryMetadata>;
  
  /**
   * Map of tags to keys
   */
  tagIndex: Map<string, Set<string>>;
  
  /**
   * When the metadata was last updated
   */
  lastUpdated: number;
  
  /**
   * Total number of entries
   */
  count: number;
}