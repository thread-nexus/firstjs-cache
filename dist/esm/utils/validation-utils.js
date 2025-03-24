/**
 * @fileoverview Validation utilities for cache operations
 */
import { CacheError, CacheErrorCode } from './error-utils';
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
export function validateCacheKey(key) {
    if (!key) {
        throw new CacheError(CacheErrorCode.INVALID_KEY, 'Cache key cannot be empty', { operation: 'validate' });
    }
    if (typeof key !== 'string') {
        throw new CacheError(CacheErrorCode.INVALID_KEY, `Cache key must be a string, got ${typeof key}`, { operation: 'validate' });
    }
    if (key.length > MAX_KEY_LENGTH) {
        throw new CacheError(CacheErrorCode.KEY_TOO_LONG, `Cache key exceeds maximum length of ${MAX_KEY_LENGTH} characters`, { operation: 'validate', key });
    }
}
/**
 * Validate cache options
 *
 * @param options - Cache options to validate
 * @throws {CacheError} If options are invalid
 */
export function validateCacheOptions(options) {
    if (!options) {
        return;
    }
    if (typeof options !== 'object') {
        throw new CacheError(CacheErrorCode.INVALID_ARGUMENT, `Cache options must be an object, got ${typeof options}`, { operation: 'validate' });
    }
    if (options.ttl !== undefined && (typeof options.ttl !== 'number' || options.ttl < 0)) {
        throw new CacheError(CacheErrorCode.INVALID_ARGUMENT, `TTL must be a non-negative number, got ${options.ttl}`, { operation: 'validate' });
    }
    if (options.tags !== undefined && !Array.isArray(options.tags)) {
        throw new CacheError(CacheErrorCode.INVALID_ARGUMENT, `Tags must be an array, got ${typeof options.tags}`, { operation: 'validate' });
    }
}
/**
 * Validate that a value can be cached
 *
 * @param value - Value to validate
 * @throws {CacheError} If value cannot be cached
 */
export function validateCacheValue(value) {
    if (value === undefined) {
        throw new CacheError(CacheErrorCode.INVALID_ARGUMENT, 'Cannot cache undefined value', { operation: 'validate' });
    }
    try {
        // Check if value can be serialized
        JSON.stringify(value);
    }
    catch (error) {
        throw new CacheError(CacheErrorCode.SERIALIZATION_ERROR, 'Value cannot be serialized to JSON', { operation: 'validate' });
    }
}
//# sourceMappingURL=validation-utils.js.map