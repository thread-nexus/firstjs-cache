"use strict";
/**
 * @fileoverview Validation utilities for cache operations with performance optimizations
 * and comprehensive error checking.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = exports.CacheValidationError = void 0;
exports.validateCacheKey = validateCacheKey;
exports.validateCacheOptions = validateCacheOptions;
exports.validateValueSize = validateValueSize;
exports.validateBatchOperation = validateBatchOperation;
exports.validatePattern = validatePattern;
const default_config_1 = require("../config/default-config");
// Optimization: Pre-compile validation regexes
const KEY_REGEX = /^[a-zA-Z0-9_:.-]+$/;
const NAMESPACE_REGEX = /^[a-zA-Z0-9_-]+$/;
/**
 * Cache validation error with detailed information
 */
class CacheValidationError extends Error {
    constructor(message, code, details) {
        super(message);
        this.code = code;
        this.details = details;
        this.name = 'CacheValidationError';
    }
}
exports.CacheValidationError = CacheValidationError;
/**
 * Validate a cache key
 *
 * @param key - The cache key to validate
 * @throws {CacheValidationError} If key is invalid
 *
 * @complexity Time: O(1)
 * @category Validation
 * @priority Critical
 */
function validateCacheKey(key) {
    if (!key) {
        throw new CacheValidationError('Cache key cannot be empty', 'EMPTY_KEY');
    }
    if (key.length > default_config_1.CACHE_CONSTANTS.MAX_KEY_LENGTH) {
        throw new CacheValidationError(`Cache key exceeds maximum length of ${default_config_1.CACHE_CONSTANTS.MAX_KEY_LENGTH}`, 'KEY_TOO_LONG', { key, length: key.length, maxLength: default_config_1.CACHE_CONSTANTS.MAX_KEY_LENGTH });
    }
    if (!KEY_REGEX.test(key)) {
        throw new CacheValidationError('Cache key contains invalid characters', 'INVALID_KEY_CHARS', { key, pattern: KEY_REGEX.source });
    }
}
/**
 * Validate cache options
 *
 * @param options - Cache options to validate
 * @throws {CacheValidationError} If options are invalid
 *
 * @complexity Time: O(1)
 * @category Validation
 * @priority High
 */
function validateCacheOptions(options) {
    if (!options)
        return;
    // Validate TTL
    if (options.ttl !== undefined) {
        if (typeof options.ttl !== 'number' || options.ttl < 0) {
            throw new CacheValidationError('TTL must be a non-negative number', 'INVALID_TTL', { ttl: options.ttl });
        }
        if (options.ttl > default_config_1.CACHE_CONSTANTS.MAX_TTL) {
            throw new CacheValidationError(`TTL exceeds maximum value of ${default_config_1.CACHE_CONSTANTS.MAX_TTL}`, 'TTL_TOO_LARGE', { ttl: options.ttl, maxTtl: default_config_1.CACHE_CONSTANTS.MAX_TTL });
        }
    }
    // Validate tags
    if (options.tags !== undefined) {
        if (!Array.isArray(options.tags)) {
            throw new CacheValidationError('Tags must be an array', 'INVALID_TAGS_TYPE', { tags: options.tags });
        }
        options.tags.forEach(tag => {
            if (typeof tag !== 'string' || !NAMESPACE_REGEX.test(tag)) {
                throw new CacheValidationError('Invalid tag format', 'INVALID_TAG', { tag, pattern: NAMESPACE_REGEX.source });
            }
        });
    }
    // Validate refresh threshold
    if (options.refreshThreshold !== undefined) {
        if (typeof options.refreshThreshold !== 'number' ||
            options.refreshThreshold < 0 ||
            options.refreshThreshold > 1) {
            throw new CacheValidationError('Refresh threshold must be between 0 and 1', 'INVALID_REFRESH_THRESHOLD', { threshold: options.refreshThreshold });
        }
    }
    // Validate compression options
    if (options.compression) {
        if (options.compressionThreshold !== undefined &&
            (typeof options.compressionThreshold !== 'number' ||
                options.compressionThreshold < 0)) {
            throw new CacheValidationError('Compression threshold must be a non-negative number', 'INVALID_COMPRESSION_THRESHOLD', { threshold: options.compressionThreshold });
        }
    }
}
/**
 * Validate cache value size
 *
 * @param value - Value to validate
 * @throws {CacheValidationError} If value size exceeds limits
 *
 * @complexity Time: O(n) where n is value size
 * @category Validation
 * @priority High
 */
function validateValueSize(value) {
    const size = new TextEncoder().encode(JSON.stringify(value)).length;
    if (size > default_config_1.CACHE_CONSTANTS.MAX_VALUE_SIZE) {
        throw new CacheValidationError(`Cache value exceeds maximum size of ${default_config_1.CACHE_CONSTANTS.MAX_VALUE_SIZE} bytes`, 'VALUE_TOO_LARGE', { size, maxSize: default_config_1.CACHE_CONSTANTS.MAX_VALUE_SIZE });
    }
}
/**
 * Validate batch operation parameters
 *
 * @param keys - Array of keys for batch operation
 * @throws {CacheValidationError} If batch parameters are invalid
 *
 * @complexity Time: O(n) where n is number of keys
 * @category Validation
 * @priority Medium
 */
function validateBatchOperation(keys) {
    if (!Array.isArray(keys)) {
        throw new CacheValidationError('Keys must be an array', 'INVALID_KEYS_TYPE', { keys });
    }
    if (keys.length > default_config_1.CACHE_CONSTANTS.DEFAULT_BATCH_SIZE) {
        throw new CacheValidationError(`Batch size exceeds maximum of ${default_config_1.CACHE_CONSTANTS.DEFAULT_BATCH_SIZE}`, 'BATCH_TOO_LARGE', { size: keys.length, maxSize: default_config_1.CACHE_CONSTANTS.DEFAULT_BATCH_SIZE });
    }
    keys.forEach(key => validateCacheKey(key));
}
/**
 * Validate pattern for key matching
 *
 * @param pattern - Pattern to validate
 * @throws {CacheValidationError} If pattern is invalid
 *
 * @complexity Time: O(1)
 * @category Validation
 * @priority Medium
 */
function validatePattern(pattern) {
    if (!pattern) {
        throw new CacheValidationError('Pattern cannot be empty', 'EMPTY_PATTERN');
    }
    try {
        new RegExp(pattern);
    }
    catch (error) {
        throw new CacheValidationError('Invalid pattern syntax', 'INVALID_PATTERN', { pattern, error: error.message });
    }
}
// Documentation metadata
exports.metadata = {
    category: types_1.DocCategory.VALIDATION,
    priority: 1 /* DocPriority.CRITICAL */,
    complexity: {
        time: 'O(1) for most validations, O(n) for batch operations',
        space: 'O(1)',
        impact: "minimal" /* PerformanceImpact.MINIMAL */,
        notes: 'Optimized with pre-compiled regular expressions'
    },
    examples: [{
            title: 'Basic Key Validation',
            code: `
      // Will throw if invalid
      validateCacheKey('user:123:profile');
      
      // Validate cache options
      validateCacheOptions({
        ttl: 3600,
        tags: ['user', 'profile'],
        compression: true
      });
    `,
            description: 'Validate cache keys and options'
        }],
    since: '1.0.0'
};
