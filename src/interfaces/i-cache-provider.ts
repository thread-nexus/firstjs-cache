/**
 * Cache provider interface
 */

import { CacheOptions, CacheStats, EntryMetadata, HealthStatus } from '../types/common';

/**
 * Interface for cache providers
 */
export interface ICacheProvider {
  /**
   * Get a value from cache
   * 
   * @param key - The cache key
   * @returns The cached value or null if not found
   */
  get(key: string): Promise<any>;
  
  /**
   * Store a value in cache
   * 
   * @param key - The cache key
   * @param value - The value to cache
   * @param options - Cache options including TTL and tags
   */
  set(key: string, value: any, options?: CacheOptions): Promise<void>;
  
  /**
   * Delete a value from cache
   * 
   * @param key - The cache key
   * @returns True if the item was deleted, false otherwise
   */
  delete(key: string): Promise<boolean>;
  
  /**
   * Clear all values
   */
  clear(): Promise<void>;
  
  /**
   * Check if a key exists in cache
   * 
   * @param key - The cache key
   * @returns Whether the key exists
   */
  has?(key: string): Promise<boolean>;
  
  /**
   * Get cache statistics
   * 
   * @returns Cache statistics
   */
  getStats?(): Promise<CacheStats>;
  
  /**
   * Invalidate all entries with a given tag
   * 
   * @param tag - Tag to invalidate
   */
  invalidateByTag?(tag: string): Promise<void>;
  
  /**
   * Initialize with options
   * 
   * @param options - Provider options
   */
  init?(options: any): void;
  
  /**
   * Get all keys matching a pattern
   * 
   * @param pattern - The pattern to match keys against
   * @returns Array of matching keys
   */
  keys?(pattern?: string): Promise<string[]>;
  
  /**
   * Get multiple values at once
   * 
   * @param keys - Keys to retrieve
   * @returns Object mapping keys to values
   */
  getMany?<T>(keys: string[]): Promise<Record<string, T | null>>;
  
  /**
   * Set multiple values at once
   * 
   * @param entries - Key-value pairs to set
   * @param options - Cache options
   */
  setMany?(entries: Record<string, any>, options?: CacheOptions): Promise<void>;
  
  /**
   * Perform a health check
   * 
   * @returns Health status
   */
  healthCheck?(): Promise<HealthStatus>;
  
  /**
   * Dispose of resources
   */
  dispose?(): Promise<void>;
  
  /**
   * Get metadata for a key
   * 
   * @param key - The cache key
   * @returns Entry metadata or null if not found
   */
  getMetadata?(key: string): Promise<EntryMetadata | null>;
  
  /**
   * Provider name (optional)
   */
  name?: string;
}