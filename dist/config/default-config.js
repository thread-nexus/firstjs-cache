"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERROR_MESSAGES = exports.CACHE_CONSTANTS = exports.DEFAULT_CONFIG = void 0;
/**
 * Default cache configuration
 */
exports.DEFAULT_CONFIG = {
    defaultTtl: 3600, // 1 hour
    deduplicateRequests: true,
    backgroundRefresh: true,
    refreshThreshold: 0.75, // Refresh when 75% of TTL has elapsed
    throwOnErrors: false,
    logging: true,
    logStackTraces: false,
    defaultOptions: {
        compression: false,
        compressionThreshold: 1024, // 1KB
        backgroundRefresh: true,
        refreshThreshold: 0.75
    }
};
/**
 * Cache environment constants
 */
exports.CACHE_CONSTANTS = {
    MAX_KEY_LENGTH: 250,
    MAX_VALUE_SIZE: 5 * 1024 * 1024, // 5MB
    MIN_TTL: 1, // 1 second
    MAX_TTL: 2592000, // 30 days
    DEFAULT_BATCH_SIZE: 100,
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_DELAY_BASE: 1000, // 1 second
    MAX_CONCURRENT_OPERATIONS: 10
};
/**
 * Cache error messages
 */
exports.ERROR_MESSAGES = {
    INVALID_KEY: 'Invalid cache key',
    KEY_TOO_LONG: 'Cache key exceeds maximum length',
    VALUE_TOO_LARGE: 'Cache value exceeds maximum size',
    INVALID_TTL: 'Invalid TTL value',
    PROVIDER_NOT_FOUND: 'Cache provider not found',
    SERIALIZATION_FAILED: 'Failed to serialize cache value',
    DESERIALIZATION_FAILED: 'Failed to deserialize cache value',
    COMPRESSION_FAILED: 'Failed to compress cache value',
    DECOMPRESSION_FAILED: 'Failed to decompress cache value',
    OPERATION_FAILED: 'Cache operation failed',
    PROVIDER_ERROR: 'Cache provider error'
};
