/**
 * Cache compute utilities
 */

import {CacheOptions} from '../types';
import {TIME_CONSTANTS} from '../constants';
import {ComputeOptions} from './cache-compute-types';

/**
 * Cache compute utilities
 */
export class CacheComputeUtils {
    /**
     * Execute with retry logic
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        options?: ComputeOptions
    ): Promise<T> {
        const maxRetries = options?.maxRetries || 3;
        const retryDelay = options?.retryDelay || TIME_CONSTANTS.SECOND;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt >= maxRetries) {
                    throw error;
                }

                const delay = retryDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw new Error('Exceeded maximum number of retries');
    }

    /**
     * Check if a value is stale
     */
    isValueStale(
        refreshedAt?: Date,
        options?: CacheOptions,
        defaultTtl: number = 3600,
        defaultRefreshThreshold: number = 0.75
    ): boolean {
        if (!refreshedAt) return true;

        const ttl = options?.ttl || defaultTtl;
        const threshold = options?.refreshThreshold || defaultRefreshThreshold;

        const age = Date.now() - refreshedAt.getTime();
        return age > ttl * threshold * TIME_CONSTANTS.SECOND;
    }

    /**
     * Check if background refresh should be used
     */
    shouldBackgroundRefresh(
        options?: CacheOptions,
        defaultBackgroundRefresh: boolean = true
    ): boolean {
        return options?.backgroundRefresh ?? defaultBackgroundRefresh;
    }
}