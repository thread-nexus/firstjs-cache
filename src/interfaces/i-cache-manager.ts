/**
 * @fileoverview Interface definition for the cache manager
 * 
 * This module defines the interface for the main cache manager that orchestrates
 * multiple providers, handles operations, and provides core caching functionality.
 * 
 * @module interfaces/i-cache-manager
 */

import { ICacheProvider } from './i-cache-provider';
import { CacheOptions, CacheStats, EntryMetadata } from '../types';

/**
 * Interface for the main cache manager
 * 
 * @interface ICacheManager
 */
export interface ICacheManager {
  /**
   * Get a value from the cache
   * 
   * @template T Type of the value to retrieve
   * @param {string} key - Cache key
   * @param {any} [options] - Get options
   * @returns {Promise<T | null>} Cached value or null if not found
   */
  get<T = any>(key: string, options?: any): Promise<T | null>;
  
  /**
   * Store a value in the cache
   * 
   * @template T Type of the value to cache
   * @param {string} key - Cache key
   * @param {T} value - Value to store
   * @param {CacheOptions} [options] - Cache options
   * @returns {Promise<void>}
   */
  set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;
  
  /**
   * Delete a value from the cache
   * 
   * @param {string} key - Cache key to delete
   * @returns {Promise<boolean>} Whether the key was found and deleted
   */
  delete(key: string): Promise<boolean>;
  
  /**
   * Clear all values from the cache
   * 
   * @returns {Promise<void>}
   */
  clear(): Promise<void>;
  
  /**
   * Get a value from cache or compute it if not available
   * 
   * @template T Type of the value
   * @param {string} key - Cache key
   * @param {() => Promise<T>} fn - Function to compute value if not found
   * @param {CacheOptions} [options] - Cache options
   * @returns {Promise<T>} Cached or computed value
   */
  getOrCompute<T = any>(key: string, fn: () => Promise<T>, options?: CacheOptions): Promise<T>;
  
  /**
   * Get statistics for all providers
   * 
   * @returns {Promise<Record<string, CacheStats>>} Stats by provider name
   */
  getStats(): Promise<Record<string, CacheStats>>;
  
  /**
   * Get a specific provider by name
   * 
   * @param {string} name - Provider name
   * @returns {ICacheProvider | null} Provider or null if not found
   */
  getProvider(name: string): ICacheProvider | null;
  
  /**
   * Wrap a function with caching behavior
   * 
   * @template T Function type
   * @param {T} fn - Function to wrap
   * @param {Function} [keyGenerator] - Function to generate cache keys from arguments
   * @param {CacheOptions} [options] - Cache options
   * @returns {T & { invalidateCache: Function }} Wrapped function with invalidation method
   */
  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator?: (...args: any[]) => string,
    options?: CacheOptions
  ): T & { invalidateCache: (...args: any[]) => Promise<void> };
  
  /**
   * Invalidate all entries with the specified tag
   * 
   * @param {string} tag - Tag to invalidate
   * @returns {Promise<void>}
   */
  invalidateByTag(tag: string): Promise<void>;
  
  /**
   * Get metadata for a cache entry
   * 
   * @param {string} key - Cache key
   * @returns {EntryMetadata | undefined} Entry metadata if available
   */
  getMetadata(key: string): EntryMetadata | undefined;
  
  /**
   * Get all cache keys matching a pattern
   * 
   * @param {string} [pattern] - Pattern to match
   * @returns {Promise<string[]>} Matching keys
   */
  keys(pattern?: string): Promise<string[]>;
  
  /**
   * Get multiple values from the cache
   * 
   * @param {string[]} keys - Keys to retrieve
   * @returns {Promise<Record<string, any>>} Map of keys to values
   */
  getMany(keys: string[]): Promise<Record<string, any>>;
  
  /**
   * Store multiple values in the cache
   * 
   * @param {Record<string, any>} entries - Map of keys to values
   * @param {CacheOptions} [options] - Cache options
   * @returns {Promise<void>}
   */
  setMany(entries: Record<string, any>, options?: CacheOptions): Promise<void>;
  
  /**
   * Invalidate all entries with keys starting with the prefix
   * 
   * @param {string} prefix - Key prefix
   * @returns {Promise<void>}
   */
  invalidateByPrefix(prefix: string): Promise<void>;
  
  /**
   * Delete entries matching a pattern
   * 
   * @param {string} pattern - RegExp pattern
   * @returns {Promise<void>}
   */
  deleteByPattern(pattern: string): Promise<void>;
}