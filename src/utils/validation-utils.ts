/**
 * @fileoverview Utilities for validating cache keys and options
 */

import { CacheOptions } from '../types/common';
import { CACHE_CONSTANTS, ERROR_MESSAGES } from '../config/default-config';

/**
 * Validate a cache key
 * 
 * @param key - Cache key to validate
 * @throws Error if key is invalid
 */
export function validateCacheKey(key: string): void {
  if (!key) {
    throw new Error(ERROR_MESSAGES.INVALID_KEY);
  }

  if (typeof key !== 'string') {
    throw new Error(`${ERROR_MESSAGES.INVALID_KEY}: must be a string`);
  }

  if (key.length > CACHE_CONSTANTS.MAX_KEY_LENGTH) {
    throw new Error(`${ERROR_MESSAGES.KEY_TOO_LONG}: max length is ${CACHE_CONSTANTS.MAX_KEY_LENGTH}`);
  }
}

/**
 * Validate cache options
 * 
 * @param options - Cache options to validate
 * @throws Error if options are invalid
 */
export function validateCacheOptions(options?: CacheOptions): void {
  if (!options) {
    return;
  }

  // Validate TTL
  if (options.ttl !== undefined) {
    if (typeof options.ttl !== 'number') {
      throw new Error(`Invalid TTL: must be a number`);
    }

    if (options.ttl < 0) {
      throw new Error(`Invalid TTL: must be non-negative`);
    }

    if (options.ttl > 0 && options.ttl < CACHE_CONSTANTS.MIN_TTL) {
      throw new Error(`TTL too small: minimum is ${CACHE_CONSTANTS.MIN_TTL} second(s)`);
    }

    if (options.ttl > CACHE_CONSTANTS.MAX_TTL) {
      throw new Error(`TTL too large: maximum is ${CACHE_CONSTANTS.MAX_TTL} seconds`);
    }
  }

  // Validate tags
  if (options.tags !== undefined) {
    if (!Array.isArray(options.tags)) {
      throw new Error(`Invalid tags: must be an array`);
    }

    for (const tag of options.tags) {
      if (typeof tag !== 'string') {
        throw new Error(`Invalid tag: must be a string`);
      }

      if (!tag) {
        throw new Error(`Invalid tag: cannot be empty`);
      }
    }
  }

  // Validate refresh threshold
  if (options.refreshThreshold !== undefined) {
    if (typeof options.refreshThreshold !== 'number') {
      throw new Error(`Invalid refresh threshold: must be a number`);
    }

    if (options.refreshThreshold < 0 || options.refreshThreshold > 1) {
      throw new Error(`Invalid refresh threshold: must be between 0 and 1`);
    }
  }

  // Validate compression threshold
  if (options.compressionThreshold !== undefined) {
    if (typeof options.compressionThreshold !== 'number') {
      throw new Error(`Invalid compression threshold: must be a number`);
    }

    if (options.compressionThreshold < 0) {
      throw new Error(`Invalid compression threshold: must be non-negative`);
    }
  }
}

/**
 * Validate a value size
 * 
 * @param value - Value to check
 * @throws Error if value is too large
 */
export function validateValueSize(value: any): void {
  // Skip validation for primitives
  if (value === null || value === undefined || 
      typeof value === 'boolean' || 
      typeof value === 'number' ||
      (typeof value === 'string' && value.length < 1000)) {
    return;
  }

  try {
    // For objects, estimate size by serializing
    const serialized = JSON.stringify(value);
    const size = Buffer.byteLength(serialized, 'utf8');

    if (size > CACHE_CONSTANTS.MAX_VALUE_SIZE) {
      throw new Error(
        `${ERROR_MESSAGES.VALUE_TOO_LARGE}: ` +
        `${(size / (1024 * 1024)).toFixed(2)}MB exceeds ` +
        `${(CACHE_CONSTANTS.MAX_VALUE_SIZE / (1024 * 1024)).toFixed(2)}MB limit`
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes(ERROR_MESSAGES.VALUE_TOO_LARGE)) {
      throw error;
    }
    // If serialization fails, we can't validate size
    // This is acceptable as the serialization will fail later anyway
  }
}

/**
 * Validate batch operations
 * 
 * @param items - Items to validate
 * @param maxBatchSize - Maximum batch size
 * @throws Error if batch is too large
 */
export function validateBatch<T>(items: T[], maxBatchSize: number = CACHE_CONSTANTS.DEFAULT_BATCH_SIZE): void {
  if (!Array.isArray(items)) {
    throw new Error('Invalid batch: must be an array');
  }

  if (items.length > maxBatchSize) {
    throw new Error(`Batch too large: ${items.length} items exceeds maximum of ${maxBatchSize}`);
  }
}

/**
 * Validate a pattern for key matching
 * 
 * @param pattern - Pattern to validate
 * @throws Error if pattern is invalid
 */
export function validatePattern(pattern: string): void {
  if (!pattern) {
    throw new Error('Invalid pattern: cannot be empty');
  }

  if (typeof pattern !== 'string') {
    throw new Error('Invalid pattern: must be a string');
  }

  // Check for valid regex
  try {
    new RegExp(pattern);
  } catch (error) {
    throw new Error(`Invalid pattern: ${error instanceof Error ? error.message : String(error)}`);
  }
}