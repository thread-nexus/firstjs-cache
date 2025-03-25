/**
 * @fileoverview Interface definition for cache providers
 * 
 * This module defines the core interface that all cache providers must implement,
 * along with optional methods for extended functionality.
 * 
 * @module interfaces/i-cache-provider
 */

import { CacheOptions, CacheStats, EntryMetadata, HealthStatus } from '../types';

/**
 * Core interface for all cache providers
 * Defines the required and optional methods for cache implementations
 * 
 * @interface ICacheProvider
 */
export interface ICacheProvider {
  /**
   * Unique provider name for identification
   * This should be set during registration
   */
  name: string;
  
  /**
   * Get a value from the cache
   * 
   * @template T Type of the value to retrieve
   * @param {string} key - Cache key to retrieve
   * @returns {Promise<T | null>} The cached value or null if not found
   */
  get<T = any>(key: string): Promise<T | null>;
  
  /**
   * Store a value in the cache
   * 
   * @template T Type of the value to cache
   * @param {string} key - Cache key
   * @param {T} value - Value to store
   * @param {CacheOptions} [options] - Cache options like TTL
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
   * Check if a key exists in the cache
   * 
   * @param {string} key - Cache key to check
   * @returns {Promise<boolean>} Whether the key exists
   */
  has?(key: string): Promise<boolean>;
  
  /**
   * Get cache statistics
   * 
   * @returns {Promise<CacheStats>} Cache statistics
   */
  getStats?(): Promise<CacheStats>;
  
  /**
   * Get all cache keys matching a pattern
   * 
   * @param {string} [pattern] - Pattern to match keys
   * @returns {Promise<string[]>} Matching keys
   */
  keys?(pattern?: string): Promise<string[]>;
  
  /**
   * Get multiple values from the cache
   * 
   * @template T Type of the values to retrieve
   * @param {string[]} keys - Keys to retrieve
   * @returns {Promise<Map<string, T | null>>} Map of keys to values
   */
  getMany?<T = any>(keys: string[]): Promise<Map<string, T | null> | Record<string, T | null>>;
  
  /**
   * Store multiple values in the cache
   * 
   * @template T Type of the values to cache
   * @param {Map<string, T> | Record<string, T>} entries - Map or record of key-value pairs
   * @param {CacheOptions} [options] - Cache options
   * @returns {Promise<void>}
   */
  setMany?<T = any>(entries: Map<string, T> | Record<string, T>, options?: CacheOptions): Promise<void>;
  
  /**
   * Delete multiple values from the cache
   * 
   * @param {string[]} keys - Keys to delete
   * @returns {Promise<number>} Number of keys deleted
   */
  deleteMany?(keys: string[]): Promise<number>;
  
  /**
   * Invalidate all entries with the specified tag
   * 
   * @param {string} tag - Tag to invalidate
   * @returns {Promise<number>} Number of invalidated entries
   */
  invalidateByTag?(tag: string): Promise<number>;
  
  /**
   * Get metadata for a cached entry
   * 
   * @param {string} key - Cache key
   * @returns {Promise<EntryMetadata | null>} Entry metadata or null if not found
   */
  getMetadata?(key: string): Promise<EntryMetadata | null>;
  
  /**
   * Update entry metadata without changing the value
   * 
   * @param {string} key - Cache key
   * @param {Partial<EntryMetadata>} metadata - Metadata to update
   * @returns {Promise<boolean>} Whether the update was successful
   */
  updateMetadata?(key: string, metadata: Partial<EntryMetadata>): Promise<boolean>;
  
  /**
   * Touch a key to update its TTL or access time
   * 
   * @param {string} key - Cache key
   * @param {CacheOptions} [options] - Cache options
   * @returns {Promise<boolean>} Whether the key was found and updated
   */
  touch?(key: string, options?: CacheOptions): Promise<boolean>;
  
  /**
   * Increment a numeric value in the cache
   * 
   * @param {string} key - Cache key
   * @param {number} [value=1] - Amount to increment by
   * @param {CacheOptions} [options] - Cache options
   * @returns {Promise<number>} New value after increment
   */
  increment?(key: string, value?: number, options?: CacheOptions): Promise<number>;
  
  /**
   * Decrement a numeric value in the cache
   * 
   * @param {string} key - Cache key
   * @param {number} [value=1] - Amount to decrement by
   * @param {CacheOptions} [options] - Cache options
   * @returns {Promise<number>} New value after decrement
   */
  decrement?(key: string, value?: number, options?: CacheOptions): Promise<number>;
  
  /**
   * Perform a health check on the provider
   * 
   * @returns {Promise<HealthStatus>} Provider health status
   */
  healthCheck?(): Promise<HealthStatus>;
  
  /**
   * Release resources and perform cleanup
   * 
   * @returns {Promise<void>}
   */
  dispose?(): Promise<void>;
  
  /**
   * Subscribe to cache events
   * 
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   * @returns {void}
   */
  on?(event: string, listener: (...args: any[]) => void): void;
  
  /**
   * Unsubscribe from cache events
   * 
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   * @returns {void}
   */
  off?(event: string, listener: (...args: any[]) => void): void;
  
  /**
   * Execute a transaction of multiple operations
   * 
   * @param {Function} transaction - Transaction function
   * @returns {Promise<any>} Transaction result
   */
  transaction?<T>(transaction: (tx: any) => Promise<T>): Promise<T>;
}