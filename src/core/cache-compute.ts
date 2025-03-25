/**
 * @fileoverview Cache computation and function wrapping
 */

import {CacheOptions} from '../types';
import {RateLimiter} from '../utils/rate-limiter';
import {CacheMonitoring} from '../utils/monitoring-utils';
import {CacheOperations} from './cache-operations';

class P {
}

/**
 * A class that abstracts caching and computation logic, enabling efficient
 * data retrieval by leveraging a caching mechanism and computing values only when necessary.
 */
export class CacheComputation {
    /**
     * Create a new cache computation instance
     */
    constructor(
        private operations: CacheOperations,
        private rateLimiter: RateLimiter,
        private monitor: CacheMonitoring
    ) {}

    /**
     * Get a value from cache or compute it if not found
     */
    async getOrCompute<T = any>(
        key: string,
        fn: () => Promise<T>,
        options?: CacheOptions
    ): Promise<T> {
        await this.rateLimiter.limit('compute');
        const startTime = performance.now();

        try {
            const cached = await this.operations.get<T>(key);
            if (cached !== null) {
                return cached;
            }

            const value = await fn();
            await this.operations.set(key, value, options);

            this.monitor.recordMiss(performance.now() - startTime);
            
            return value;
        } catch (error) {
            // We'll let the operation class handle the error
            throw error;
        }
    }

    /**
     * Wrap a function with caching
     */
    wrap<T extends (...args: any[]) => Promise<any>>(
        fn: T,
        keyGenerator?: (...args: ((P & ((...args: P[]) => any)) | never[])[]) => string,
        options?: CacheOptions
    ): T & { invalidateCache: (...args: ((P & ((...args: P[]) => any)) | never[])[]) => Promise<void> } {
        const wrapped = async (...args: ((P & ((...args: P[]) => any)) | never[])[]): Promise<ReturnType<T>> => {
            const key = keyGenerator ? keyGenerator(...args) : `${fn.name}:${JSON.stringify(args)}`;
            return await this.getOrCompute(
                key,
                () => fn(...args),
                options
            ) as Promise<ReturnType<T>>;
        };

        const invalidateCache = async (...args: ((P & ((...args: P[]) => any)) | never[])[]): Promise<void> => {
            const key = keyGenerator ? keyGenerator(...args) : `${fn.name}:${JSON.stringify(args)}`;
            await this.operations.delete(key);
        };

        return Object.assign(wrapped, { invalidateCache }) as T & {
            invalidateCache: (...args: ((P & ((...args: P[]) => any)) | never[])[]) => Promise<void>
        };
    }
}