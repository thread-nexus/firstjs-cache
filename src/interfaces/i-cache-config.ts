/**
 * Cache configuration interface
 */

import {CacheOptions} from '../types';
import {ICacheProvider} from './i-cache-provider';

/**
 * Cache configuration
 */
export interface CacheConfig {
    /**
     * Configured cache providers
     */
    providers: ProviderConfig[];

    /**
     * Default TTL in seconds
     */
    defaultTtl?: number;

    /**
     * Default options for cache operations
     */
    defaultOptions?: CacheOptions;

    /**
     * Whether to throw errors or suppress them
     */
    throwOnErrors?: boolean;

    /**
     * Whether to enable background refresh
     */
    backgroundRefresh?: boolean;

    /**
     * Default refresh threshold (0-1)
     */
    refreshThreshold?: number;

    /**
     * Whether to deduplicate in-flight requests
     */
    deduplicateRequests?: boolean;

    /**
     * Whether to enable logging
     */
    logging?: boolean;

    /**
     * Whether to include stack traces in logs
     */
    logStackTraces?: boolean;

    /**
     * Custom logger function
     */
    logger?: (logEntry: any) => void;

    /**
     * Default batch size for batch operations
     */
    batchSize?: number;

    /**
     * Retry configuration
     */
    retry?: {
        /**
         * Number of retry attempts
         */
        attempts: number;

        /**
         * Delay between retries in milliseconds
         */
        delay: number;

        /**
         * Whether to use exponential backoff
         */
        backoff?: boolean;
    };
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
    /**
     * Name/identifier for this provider
     */
    name: string;

    /**
     * The provider instance
     */
    instance: ICacheProvider;

    /**
     * Priority (lower = faster/first checked)
     */
    priority?: number;

    /**
     * Provider-specific options
     */
    options?: any;
}