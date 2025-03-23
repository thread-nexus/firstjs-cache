/**
 * @fileoverview Interface for cache providers
 */

import { CacheOptions } from '../types/common';

/**
 * Interface for cache providers
 */
export interface ICacheProvider {
  /**
   * Get a value from cache
   * 
   * @param key - Cache key
   * @returns Cached value or null if not found
   */
  get<T = any>(key: string): Promise<T | null>;
  
  /**
   * Set a value in cache
   * 
   * @param key - Cache key
   * @param value - Value to cache
   * @param options - Cache options
   */
  set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;
  
  /**
   * Delete a value from cache
   * 
   * @param key - Cache key
   * @returns True if value was deleted, false if not found
   */
  delete(key: string): Promise<boolean>;
  
  /**
   * Clear all values from cache
   */
  clear(): Promise<void>;
  
  /**
   * Check if a key exists in cache
   * 
   * @param key - Cache key
   * @returns True if key exists
   */
  has(key: string): Promise<boolean>;
  
  /**
   * Get multiple values from cache
   * 
   * @param keys - Cache keys
   * @returns Object mapping keys to values
   */
  getMany?<T = any>(keys: string[]): Promise<Record<string, T | null>>;
  
  /**
   * Set multiple values in cache
   * 
   * @param entries - Object mapping keys to values
   * @param options - Cache options
   */
  setMany?<T = any>(entries: Record<string, T>, options?: CacheOptions): Promise<void>;
  
  /**
   * Get cache statistics
   * 
   * @returns Cache statistics
   */
  getStats?(): Promise<Record<string, any>>;
}