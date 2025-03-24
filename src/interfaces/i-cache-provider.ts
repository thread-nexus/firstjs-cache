/**
 * @fileoverview Interface for cache providers
 */

import { CacheOptions, CacheStats } from '../types/common';

/**
 * Interface for cache providers
 */
export interface ICacheProvider {
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
   * Get cache statistics
   * 
   * @returns Cache statistics
   */
  getStats(): Promise<CacheStats>;
}