/**
 * @fileoverview Validation utilities for cache operations
 */

import { CacheOptions } from '../types/common';
import { CacheError, CacheErrorCode } from './error-utils';

/**
 * Cache operation context
 */
export interface CacheOperationContext {
  /** Operation name */
  operation?: string;
  
  /** Cache key */
  key?: string;
  
  /** List of cache keys */
  keys?: string[];
  
  /** Cache provider name */
  provider?: string;
  
  /** Additional context data */
  context?: Record<string, any>;
  
  /** Optional error cause */
  cause?: Error;
  
  /** Cache tag */
  tag?: string;
  
  /** Cache key prefix */
  prefix?: string;
  
  /** Entries for batch operations */
  entries?: Record<string, any> | string[];
  
  /** Operation error count */
  errorCount?: number;
  
  /** Whether the data is compressed */
  compressed?: boolean;
  
  /** Operation start time */
  startTime?: number;
  
  /** Operation options */
  options?: any;
  
  /** Custom properties for specific operations */
  [key: string]: any;
}

/**
 * Maximum allowed key length
 */
const MAX_KEY_LENGTH = 1024;
/**
 * Validate a cache key
 * 
 * @param key - Cache key to validate
 * @throws {CacheError} If key is invalid
 */
export function validateCacheKey(key: string): void {
  if (!key) {
    throw new CacheError(
      CacheErrorCode.INVALID_KEY,
      'Cache key cannot be empty',
      { operation: 'validate' }
    );
  }
  
  if (typeof key !== 'string') {
    throw new CacheError(
      CacheErrorCode.INVALID_KEY,
      `Cache key must be a string, got ${typeof key}`,
      { operation: 'validate' }
    );
  }

  if (key.length > MAX_KEY_LENGTH) {
    throw new CacheError(
      CacheErrorCode.KEY_TOO_LONG,
      `Cache key exceeds maximum length of ${MAX_KEY_LENGTH} characters`,
      { operation: 'validate', key }
    );
  }
}

/**
 * Validate cache options
 * 
 * @param options - Cache options to validate
 * @throws {CacheError} If options are invalid
 */
export function validateCacheOptions(options?: CacheOptions): void {
  if (!options) {
    return;
  }

  if (typeof options !== 'object') {
    throw new CacheError(
      CacheErrorCode.INVALID_ARGUMENT,
      `Cache options must be an object, got ${typeof options}`,
      { operation: 'validate' }
    );
  }

  if (options.ttl !== undefined && (typeof options.ttl !== 'number' || options.ttl < 0)) {
    throw new CacheError(
      CacheErrorCode.INVALID_ARGUMENT,
      `TTL must be a non-negative number, got ${options.ttl}`,
      { operation: 'validate' }
    );
  }

  if (options.tags !== undefined && !Array.isArray(options.tags)) {
    throw new CacheError(
      CacheErrorCode.INVALID_ARGUMENT,
      `Tags must be an array, got ${typeof options.tags}`,
      { operation: 'validate' }
    );
  }
}

/**
 * Validate that a value can be cached
 * 
 * @param value - Value to validate
 * @throws {CacheError} If value cannot be cached
 */
export function validateCacheValue(value: any): void {
  if (value === undefined) {
    throw new CacheError(
      CacheErrorCode.INVALID_ARGUMENT,
      'Cannot cache undefined value',
      { operation: 'validate' }
    );
  }

  try {
    // Check if value can be serialized
    JSON.stringify(value);
  } catch (error) {
    throw new CacheError(
      CacheErrorCode.SERIALIZATION_ERROR,
      'Value cannot be serialized to JSON',
      { operation: 'validate' }
    );
  }
}