/**
 * Validation utilities for cache operations
 */

import {CacheOperationContext, CacheOptions} from '../types';
import {CacheError, CacheErrorCode} from './error-utils';
import {CACHE_CONSTANTS} from '../config/default-config';

/**
 * Maximum key length
 */
const MAX_KEY_LENGTH = CACHE_CONSTANTS.MAX_KEY_LENGTH;

/**
 * Export CacheOperationContext for other modules to use
 */
export {CacheOperationContext};

/**
 * Validate a cache key
 *
 * @param key - Cache key to validate
 * @throws CacheError if the key is invalid
 */
export function validateCacheKey(key: unknown): void {
    // Check if key is empty
    if (key === null || key === undefined || (typeof key === 'string' && key.trim() === '')) {
        throw new CacheError(
            'Cache key cannot be empty',
            CacheErrorCode.INVALID_KEY
        );
    }

    // Check if key is a string
    if (typeof key !== 'string') {
        throw new CacheError(
            `Cache key must be a string, got ${typeof key}`,
            CacheErrorCode.INVALID_KEY
        );
    }

    // Check key length
    if (key.length > MAX_KEY_LENGTH) {
        throw new CacheError(
            `Cache key exceeds maximum length of ${MAX_KEY_LENGTH} characters`,
            CacheErrorCode.KEY_TOO_LONG
        );
    }
}

/**
 * Validate cache options
 *
 * @param options - Cache options to validate
 * @throws CacheError if options are invalid
 */
export function validateCacheOptions(options: unknown): void {
    // Check if options is an object
    if (options !== undefined && options !== null && typeof options !== 'object') {
        throw new CacheError(
            `Cache options must be an object, got ${typeof options}`,
            CacheErrorCode.INVALID_ARGUMENT
        );
    }

    // Cast to CacheOptions for type checking
    const cacheOptions = options as CacheOptions;

    // Check TTL if provided
    if (cacheOptions?.ttl !== undefined && (typeof cacheOptions.ttl !== 'number' || cacheOptions.ttl < 0)) {
        throw new CacheError(
            `TTL must be a non-negative number, got ${cacheOptions.ttl}`,
            CacheErrorCode.INVALID_ARGUMENT
        );
    }

    // Check tags if provided
    if (cacheOptions?.tags !== undefined && !Array.isArray(cacheOptions.tags)) {
        throw new CacheError(
            `Tags must be an array, got ${typeof cacheOptions.tags}`,
            CacheErrorCode.INVALID_ARGUMENT
        );
    }
}

/**
 * Validate a cache value
 *
 * @param value - Cache value to validate
 * @throws CacheError if the value is invalid
 */
export function validateCacheValue(value: unknown): void {
    // Check if value is undefined
    if (value === undefined) {
        throw new CacheError(
            'Cannot cache undefined value',
            CacheErrorCode.INVALID_VALUE
        );
    }

    // Check if value can be serialized
    try {
        JSON.stringify(value);
    } catch (error) {
        throw new CacheError(
            'Value cannot be serialized to JSON',
            CacheErrorCode.SERIALIZATION_ERROR,
            error instanceof Error ? error : undefined
        );
    }
}

/**
 * Validate a cache pattern
 *
 * @param pattern - Cache pattern to validate
 * @throws CacheError if the pattern is invalid
 */
export function validateCachePattern(pattern: unknown): void {
    // Check if pattern is a string
    if (pattern !== undefined && pattern !== null && typeof pattern !== 'string') {
        throw new CacheError(
            `Cache pattern must be a string, got ${typeof pattern}`,
            CacheErrorCode.INVALID_ARGUMENT
        );
    }

    // Check if pattern is a valid regex
    if (typeof pattern === 'string' && pattern.length > 0) {
        try {
            new RegExp(pattern);
        } catch (error) {
            throw new CacheError(
                `Invalid cache pattern: ${error instanceof Error ? error.message : String(error)}`,
                CacheErrorCode.INVALID_ARGUMENT,
                error instanceof Error ? error : undefined
            );
        }
    }
}

/**
 * Validate cache entries for batch operations
 *
 * @param entries - Cache entries to validate
 * @throws CacheError if entries are invalid
 */
export function validateCacheEntries(entries: unknown): void {
    // Check if entries is an object
    if (!entries || typeof entries !== 'object' || Array.isArray(entries)) {
        throw new CacheError(
            `Cache entries must be an object, got ${entries === null ? 'null' : typeof entries}`,
            CacheErrorCode.INVALID_ARGUMENT
        );
    }

    // Check if entries is empty
    if (Object.keys(entries as object).length === 0) {
        throw new CacheError(
            'Cache entries cannot be empty',
            CacheErrorCode.INVALID_ARGUMENT
        );
    }

    // Validate each key and value
    for (const [key, value] of Object.entries(entries as Record<string, unknown>)) {
        validateCacheKey(key);
        validateCacheValue(value);
    }
}

/**
 * Sanitize a cache key
 *
 * @param key - Cache key to sanitize
 * @returns Sanitized cache key
 */
export function sanitizeCacheKey(key: string): string {
    // Replace invalid characters
    let sanitized = key.replace(/[^\w\-:.]/g, '_');

    // Truncate if too long
    if (sanitized.length > MAX_KEY_LENGTH) {
        sanitized = sanitized.substring(0, MAX_KEY_LENGTH);
    }

    return sanitized;
}