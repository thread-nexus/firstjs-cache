/**
 * @fileoverview Interface for storage adapters
 */

import { CacheOptions } from '../types/common';
import { StorageAdapterConfig } from '../types/cache-types';

/**
 * Interface for storage adapters
 */
export interface IStorageAdapter {
  /**
   * Get a value from storage
   * 
   * @param key - Storage key
   * @returns Stored value or null if not found
   */
  get<T = any>(key: string): Promise<T | null>;
  
  /**
   * Set a value in storage
   * 
   * @param key - Storage key
   * @param value - Value to store
   * @param options - Storage options
   */
  set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;
  
  /**
   * Delete a value from storage
   * 
   * @param key - Storage key
   * @returns True if value was deleted, false if not found
   */
  delete(key: string): Promise<boolean>;
  
  /**
   * Clear all values from storage
   */
  clear(): Promise<void>;
  
  /**
   * Check if a key exists in storage
   * 
   * @param key - Storage key
   * @returns True if key exists
   */
  has(key: string): Promise<boolean>;
  
  /**
   * Get multiple values from storage
   * 
   * @param keys - Storage keys
   * @returns Object mapping keys to values
   */
  getMany?<T = any>(keys: string[]): Promise<Record<string, T | null>>;
  
  /**
   * Set multiple values in storage
   * 
   * @param entries - Object mapping keys to values
   * @param options - Storage options
   */
  setMany?<T = any>(entries: Record<string, T>, options?: CacheOptions): Promise<void>;
  
  /**
   * Get keys matching a pattern
   * 
   * @param pattern - Pattern to match
   * @returns Array of matching keys
   */
  keys?(pattern?: string): Promise<string[]>;
  
  /**
   * Get storage statistics
   * 
   * @returns Storage statistics
   */
  getStats?(): Promise<Record<string, any>>;
}

/**
 * Base storage adapter configuration
 */
export interface StorageAdapterOptions extends StorageAdapterConfig {
  /**
   * Adapter name
   */
  name?: string;
  
  /**
   * Key prefix
   */
  prefix?: string;
  
  /**
   * Default TTL in seconds
   */
  defaultTtl?: number;
  
  /**
   * Whether to serialize values before storing
   */
  serialize?: boolean;
  
  /**
   * Whether to compress values before storing
   */
  compression?: boolean;
  
  /**
   * Size threshold for compression in bytes
   */
  compressionThreshold?: number;
}