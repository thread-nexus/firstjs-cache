/**
 * @fileoverview Core cache types
 */

import {EntryMetadata} from './metadata-types';

/**
 * Options for cache operations
 */
export interface CacheOptions {
  /**
   * Time-to-live in seconds
   */
  ttl?: number;
  
  /**
   * Tags for grouping and invalidation
   */
  tags?: string[];
  
  /**
   * Whether to refresh in background when stale
   */
  backgroundRefresh?: boolean;
  
  /**
   * Threshold (0-1) of TTL after which to refresh
   */
  refreshThreshold?: number;
  
  /**
   * Whether to compress the value
   */
  compression?: boolean;
  
  /**
   * Minimum size in bytes for compression to be applied
   */
  compressionThreshold?: number;
  
  /**
   * Time taken to compute the value, for metrics
   */
  computeTime?: number;
  
  /**
   * When the value was last refreshed
   */
  refreshedAt?: number;
  
  /**
   * Additional options passed to providers
   */
  [key: string]: any;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /**
   * Total size in bytes (if applicable)
   */
  size: number;
  
  /**
   * Cache hit count
   */
  hits: number;
  
  /**
   * Cache miss count
   */
  misses: number;
  
  /**
   * Number of keys in cache
   */
  keyCount: number;
  
  /**
   * Memory usage in bytes (if applicable)
   */
  memoryUsage: number;
  
  /**
   * When stats were last updated
   */
  lastUpdated: number;
  
  /**
   * Optional list of keys
   */
  keys?: string[];
  
  /**
   * Any error message if stats collection failed
   */
  error?: string;
  
  /**
   * Additional provider-specific stats
   */
  [key: string]: any;
}

/**
 * Result of a cache operation
 */
export interface CacheResult<T> {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * The value retrieved from cache
   */
  value?: T;
  
  /**
   * The cache key
   */
  key: string;
  
  /**
   * Whether the value was found in cache
   */
  found?: boolean;
  
  /**
   * The layer where the value was found
   */
  layer?: string;
  
  /**
   * Metadata for the cache entry
   */
  metadata?: EntryMetadata;
  
  /**
   * Time taken for the operation in milliseconds
   */
  duration?: number;
  
  /**
   * Any error that occurred
   */
  error?: Error;
}

/**
 * Health status of a cache provider
 */
export interface ProviderHealthStatus {
  /**
   * Whether the provider is healthy
   */
  healthy: boolean;
  
  /**
   * Status code
   */
  status: 'healthy' | 'degraded' | 'unhealthy';
  
  /**
   * Status message
   */
  message: string;
  
  /**
   * When the health check was performed
   */
  lastCheck: number;
  
  /**
   * Provider-specific details
   */
  details?: Record<string, any>;
}

/**
 * Type for a function that can be wrapped with caching
 */
export type CacheableFunction<T extends (...args: any[]) => any> = T;