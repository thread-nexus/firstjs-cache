/**
 * @fileoverview Cache validation and error handling
 */

import {CacheError, CacheErrorCode, createCacheError} from '../utils/error-utils';
import {CacheMonitoring} from '../utils/monitoring-utils';
import {CircuitBreaker} from '../utils/circuit-breaker';

/**
 * Cache validation and error handling implementation
 */
export class CacheValidation {
    /**
     * Create a new cache validation instance
     */
    constructor(
        private monitor: CacheMonitoring,
        private circuitBreaker: CircuitBreaker
    ) {}

    /**
     * Validate a cache key
     */
    validateKey(key: string): void {
        if (!key || typeof key !== 'string') {
            throw createCacheError(
                'Cache key must be a non-empty string',
                CacheErrorCode.INVALID_KEY
            );
        }

        if (key.length > 250) {
            throw createCacheError(
                'Cache key must be less than 256 characters',
                CacheErrorCode.KEY_TOO_LONG
            );
        }
    }

    /**
     * Validate a cache value
     */
    validateValue(value: any): void {
        if (value === undefined) {
            throw createCacheError(
                'Cannot cache undefined value',
                CacheErrorCode.INVALID_VALUE
            );
        }
    }

    /**
     * Handle cache operation errors
     */
    handleError(
        operation: string,
        error: Error,
        context?: Record<string, any>
    ): void {
        // Record error in monitoring if available
        if (this.monitor && typeof this.monitor.recordError === 'function') {
            this.monitor.recordError(new Error(operation));
        }

        const cacheError = error instanceof CacheError ? error :
            createCacheError(
                `Cache ${operation} operation failed: ${error.message}`,
                CacheErrorCode.UNKNOWN_ERROR,
                error
            );

        console.error(`CacheManager error in operation "${operation}":`, cacheError);

        throw cacheError;
    }
}