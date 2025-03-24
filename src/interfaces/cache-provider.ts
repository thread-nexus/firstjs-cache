/**
 * @fileoverview Interface for cache providers
 */

import { CacheOptions, CacheStats, HealthStatus } from '../types/index';

/**
 * Interface for cache providers
 */
export interface ICacheProvider {
  /** 
   * Provider name 
   */
  readonly name: string;
  
  /**
   * Get a value from the cache
   * 
   * @param key - Cache key
   * @returns Cached value or null if not found
   */
  get<T = any>(key: string): Promise<T | null>;
  
  /**
   * Set a value in the cache
   * 
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options
   */
  set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;
  
  /**
   * Delete a value from the cache
   * 
   * @param key - Cache key
   * @returns Whether the key was deleted
   */
  delete(key: string): Promise<boolean>;
  
  /**
   * Clear all values from the cache
   */
  clear(): Promise<void>;
  
  /**
   * Check if a key exists in the cache
   */
  has(key: string): Promise<boolean>;
  
  /**
   * Get multiple values from the cache
   */
  getMany<T = any>(keys: string[]): Promise<Record<string, T | null>>;
  
  /**
   * Set multiple values in the cache
   */
  setMany<T = any>(entries: Record<string, T>, options?: CacheOptions): Promise<void>;
  
  /**
   * Get cache statistics
   */
  getStats(): Promise<CacheStats>;
  
  /**
   * Perform health check
   */
  healthCheck(): Promise<HealthStatus>;
  
  /**
   * Invalidate cache entries by tag
   */
  invalidateByTag?(tag: string): Promise<void>;
  
  /**
   * Invalidate cache entries by prefix
   */
  invalidateByPrefix?(prefix: string): Promise<void>;
}
