/**
 * Default configuration for the cache system
 */

import {CacheOptions} from '../types';

/**
 * Cache constants
 */
export const CACHE_CONSTANTS = {
    /**
     * Default TTL in seconds (1 hour)
     */
    DEFAULT_TTL: 3600,

    /**
     * Default refresh threshold (80% of TTL)
     */
    DEFAULT_REFRESH_THRESHOLD: 0.8,

    /**
     * Maximum key length
     */
    MAX_KEY_LENGTH: 255,

    /**
     * Default compression threshold (1KB)
     */
    DEFAULT_COMPRESSION_THRESHOLD: 1024,

    /**
     * Default batch size
     */
    DEFAULT_BATCH_SIZE: 100,

    /**
     * Default retry attempts
     */
    DEFAULT_RETRY_ATTEMPTS: 3,

    /**
     * Default retry delay in milliseconds
     */
    DEFAULT_RETRY_DELAY: 100,

    /**
     * Maximum metadata history size
     */
    MAX_METADATA_HISTORY: 10
};

/**
 * Default cache configuration
 */
export const DEFAULT_CONFIG = {
    /**
     * Default TTL in seconds
     */
    defaultTtl: CACHE_CONSTANTS.DEFAULT_TTL,

    /**
     * Default options for cache operations
     */
    defaultOptions: {
        ttl: CACHE_CONSTANTS.DEFAULT_TTL,
        backgroundRefresh: true,
        refreshThreshold: CACHE_CONSTANTS.DEFAULT_REFRESH_THRESHOLD,
        compression: false,
        compressionThreshold: CACHE_CONSTANTS.DEFAULT_COMPRESSION_THRESHOLD
    } as CacheOptions,

    /**
     * Whether to throw errors or suppress them
     */
    throwOnErrors: false,

    /**
     * Whether to enable background refresh
     */
    backgroundRefresh: true,

    /**
     * Default refresh threshold (0-1)
     */
    refreshThreshold: CACHE_CONSTANTS.DEFAULT_REFRESH_THRESHOLD,

    /**
     * Whether to deduplicate in-flight requests
     */
    deduplicateRequests: true,

    /**
     * Whether to enable logging
     */
    logging: true,

    /**
     * Whether to include stack traces in logs
     */
    logStackTraces: false,

    /**
     * Default logger function
     */
    logger: console.log,

    /**
     * Default batch size
     */
    batchSize: CACHE_CONSTANTS.DEFAULT_BATCH_SIZE,

    /**
     * Default retry configuration
     */
    retry: {
        attempts: CACHE_CONSTANTS.DEFAULT_RETRY_ATTEMPTS,
        delay: CACHE_CONSTANTS.DEFAULT_RETRY_DELAY
    }
};

/**
 * Merge cache options with defaults
 *
 * @param options - User options
 * @param defaults - Default options
 * @returns Merged options
 */
export function mergeCacheOptions(
    options: CacheOptions = {},
    defaults: CacheOptions = DEFAULT_CONFIG.defaultOptions
): CacheOptions {
    return {
        ...defaults,
        ...options,
        // Merge tags if both exist
        tags: options.tags && defaults.tags
            ? [...new Set([...defaults.tags, ...options.tags])]
            : options.tags || defaults.tags
    };
}