"use strict";
/**
 * @fileoverview Validation utilities for cache operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCacheKey = validateCacheKey;
exports.validateCacheOptions = validateCacheOptions;
exports.validateCacheValue = validateCacheValue;
const error_utils_1 = require("./error-utils");
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
function validateCacheKey(key) {
    if (!key) {
        throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.INVALID_KEY, 'Cache key cannot be empty', { operation: 'validate' });
    }
    if (typeof key !== 'string') {
        throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.INVALID_KEY, `Cache key must be a string, got ${typeof key}`, { operation: 'validate' });
    }
    if (key.length > MAX_KEY_LENGTH) {
        throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.KEY_TOO_LONG, `Cache key exceeds maximum length of ${MAX_KEY_LENGTH} characters`, { operation: 'validate', key });
    }
}
/**
 * Validate cache options
 *
 * @param options - Cache options to validate
 * @throws {CacheError} If options are invalid
 */
function validateCacheOptions(options) {
    if (!options) {
        return;
    }
    if (typeof options !== 'object') {
        throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.INVALID_ARGUMENT, `Cache options must be an object, got ${typeof options}`, { operation: 'validate' });
    }
    if (options.ttl !== undefined && (typeof options.ttl !== 'number' || options.ttl < 0)) {
        throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.INVALID_ARGUMENT, `TTL must be a non-negative number, got ${options.ttl}`, { operation: 'validate' });
    }
    if (options.tags !== undefined && !Array.isArray(options.tags)) {
        throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.INVALID_ARGUMENT, `Tags must be an array, got ${typeof options.tags}`, { operation: 'validate' });
    }
}
/**
 * Validate that a value can be cached
 *
 * @param value - Value to validate
 * @throws {CacheError} If value cannot be cached
 */
function validateCacheValue(value) {
    if (value === undefined) {
        throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.INVALID_ARGUMENT, 'Cannot cache undefined value', { operation: 'validate' });
    }
    try {
        // Check if value can be serialized
        JSON.stringify(value);
    }
    catch (error) {
        throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.SERIALIZATION_ERROR, 'Value cannot be serialized to JSON', { operation: 'validate' });
    }
}
//# sourceMappingURL=validation-utils.js.map