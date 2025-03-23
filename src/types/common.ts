/**
 * @fileoverview Common types used throughout the cache module
 */

/**
 * Cache options for storing values
 */
export interface CacheOptions {
  /**
   * Time to live in seconds
   */
  ttl?: number;
  
  /**
   * Tags for categorizing and invalidating cache entries
   */
  tags?: string[];
  
  /**
   * Whether to enable compression for this entry
   */
  compression?: boolean;
  
  /**
   * Size threshold in bytes for applying compression
   */
  compressionThreshold?: number;
  
  /**
   * Whether to enable background refresh for this entry
   */
  backgroundRefresh?: boolean;
  
  /**
   * Percentage of TTL elapsed before triggering background refresh (0-1)
   */
  refreshThreshold?: number;
  
  /**
   * Custom serialization function
   */
  serialize?: (value: any) => string;
  
  /**
   * Custom deserialization function
   */
  deserialize?: (serialized: string) => any;
  
  /**
   * Additional provider-specific options
   */
  [key: string]: any;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /**
   * Number of cache hits
   */
  hits: number;
  
  /**
   * Number of cache misses
   */
  misses: number;
  
  /**
   * Number of cache entries
   */
  size: number;
  
  /**
   * Average hit ratio (hits / (hits + misses))
   */
  hitRatio: number;
  
  /**
   * Total memory usage in bytes
   */
  memoryUsage: number;
  
  /**
   * Provider-specific statistics
   */
  providers: Record<string, any>;
  
  /**
   * Timestamp when stats were collected
   */
  timestamp: number;
}

/**
 * Cache compute result
 */
export interface CacheComputeResult<T> {
  /**
   * Computed value
   */
  value: T;
  
  /**
   * Whether the value was from cache
   */
  fromCache: boolean;
  
  /**
   * Whether the value is stale
   */
  isStale?: boolean;
  
  /**
   * Time taken to compute in milliseconds
   */
  computeTime?: number;
  
  /**
   * Metadata about the cache entry
   */
  metadata?: Record<string, any>;
}

/**
 * Cache operation result
 */
export interface CacheOperationResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Error message if operation failed
   */
  error?: string;
  
  /**
   * Time taken to complete operation in milliseconds
   */
  duration: number;
  
  /**
   * Additional result data
   */
  data?: any;
}

/**
 * Cache event handler
 */
export type CacheEventHandler = (event: string, payload: Record<string, any>) => void;

/**
 * Cache key generation function
 */
export type CacheKeyGenerator = (...args: any[]) => string;

/**
 * Cache value fetcher function
 */
export type CacheValueFetcher<T> = () => Promise<T>;

/**
 * Cache entry
 */
export interface CacheEntry<T> {
  /**
   * Cached value
   */
  value: T;
  
  /**
   * Expiration timestamp
   */
  expiresAt?: number;
  
  /**
   * When the entry was created
   */
  createdAt: number;
  
  /**
   * When the entry was last accessed
   */
  accessedAt?: number;
  
  /**
   * Size of the entry in bytes
   */
  size?: number;
  
  /**
   * Associated tags
   */
  tags?: string[];
  
  /**
   * Whether the entry is compressed
   */
  compressed?: boolean;
  
  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}