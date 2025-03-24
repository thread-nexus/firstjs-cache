/**
 * @fileoverview Enhanced interface for cache providers
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */

import { CacheOptions, CacheStats, CacheMetrics } from '../types/common';
import { HealthStatus as CommonHealthStatus } from '../types/common';

/**
 * Enhanced interface for cache providers
 */
export interface ICacheProvider {
  /** Provider name */
  readonly name: string;
  
  /**
   * Get a value from the cache with enhanced error handling
   * 
   * @param key - Cache key
   * @param options - Additional options for the get operation
   * @returns Promise resolving to cached value or null
   * @throws CacheError if operation fails
   */
  get<T = any>(key: string): Promise<T | null>;
  
  /**
   * Set a value in the cache with validation
   * 
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options
   * @returns Promise resolving when operation completes
   * @throws CacheError if operation fails
   */
  set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;
  
  /**
   * Delete a value from the cache
   * 
   * @param key - Cache key
   * @returns Promise resolving to true if key was deleted
   * @throws CacheError if operation fails
   */
  delete(key: string): Promise<boolean>;
  
  /**
   * Clear all values from the cache
   * 
   * @returns Promise resolving when operation completes
   * @throws CacheError if operation fails
   */
  clear(): Promise<void>;
  
  /**
   * Get cache statistics
   * 
   * @returns Promise resolving to cache statistics
   */
  getStats?(): Promise<CacheStats>;

  /**
   * Check if a key exists in the cache
   * 
   * @param key - Cache key
   * @returns Promise resolving to true if key exists
   */
  has?(key: string): Promise<boolean>;
  
  /**
   * Get multiple values from the cache
   * 
   * @param keys - Array of cache keys
   * @returns Promise resolving to a map of key-value pairs
   */
  getMany?<T = any>(keys: string[]): Promise<Record<string, T | null>>;
  
  /**
   * Set multiple values in the cache
   * 
   * @param entries - Map of key-value pairs
   * @param options - Cache options
   * @returns Promise resolving when operation completes
   */
  setMany?<T = any>(entries: Record<string, T>, options?: CacheOptions): Promise<void>;
  
  /**
   * Get metadata for a cache key
   * 
   * @param key - Cache key
   * @returns Promise resolving to metadata or null
   */
  getMetadata?(key: string): Promise<any | null>;

  /**
   * Set metadata for a cache key
   * 
   * @param key - Cache key
   * @param metadata - Metadata to set
   */
  setMetadata?(key: string, metadata: any): Promise<void>;

  /**
   * Get all keys in cache
   * 
   * @returns All cache keys
   */
  keys?(): Promise<string[]>;

  /**
   * Batch operations for improved performance
   */
  batch?: {
    get: <T = any>(keys: string[]) => Promise<Map<string, T | null>>;
    set: <T = any>(entries: Map<string, T>) => Promise<void>;
    delete: (keys: string[]) => Promise<boolean[]>;
  };

  /**
   * Health check method
   */
  healthCheck?(): Promise<CommonHealthStatus>;

  /**
   * Invalidate cache entries by tag
   * 
   * @param tag - Tag to invalidate
   * @returns Number of invalidated entries
   */
  invalidateByTag?(tag: string): Promise<number>;
}

/**
 * Enhanced get options
 */
export interface GetOptions extends CacheOptions {
  /**
   * Whether to return stale data if fresh data unavailable
   */
  allowStale?: boolean;
  
  /**
   * Custom deserializer
   */
  deserializer?: (data: string) => any;
  
  /**
   * Whether to refresh data in background if stale
   */
  backgroundRefresh?: boolean;
}

/**
 * Enhanced set options
 */
export interface SetOptions extends CacheOptions {
  /**
   * Whether to compress data
   */
  compress?: boolean;

  /**
   * Custom serializer
   */
  serializer?: (data: any) => string;

  /**
   * Tags for cache invalidation
   */
  tags?: string[];

  /**
   * Compute time in milliseconds
   */
  computeTime?: number;
}

/**
 * Clear options
 */
export interface ClearOptions {
  /**
   * Pattern to match keys for selective clearing
   */
  pattern?: string;
  
  /**
   * Whether to clear expired entries only
   */
  expiredOnly?: boolean;
}

/**
 * Enhanced cache statistics
 */
export interface EnhancedCacheStats extends CacheStats {
  metrics?: CacheMetrics;
  latencyPercentiles?: {
    p50: number;
    p95: number;
    p99: number;
  };
  errorRates?: {
    total: number;
    byType: Record<string, number>;
  };
}

/**
 * Health status interface
 */
export interface HealthStatus {
  healthy: boolean;
  message?: string;
  lastCheck: Date;
}
