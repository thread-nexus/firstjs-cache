/**
 * @fileoverview Batch cache operations
 */

import {CacheOptions} from '../types';
import {CacheOperations} from './cache-operations';
import {CacheValidation} from './cache-validation';

/**
 * A class to manage batch operations for caching. This class provides methods
 * to perform multiple cache actions efficiently in a single workflow, such as
 * getting or setting multiple key-value pairs at once.
 */
export class CacheBatch {
    /**
     * Create a new batch operations instance
     */
    constructor(
        private operations: CacheOperations,
        private validation: CacheValidation
    ) {}

    /**
     * Get multiple values from cache
     */
    async getMany(keys: string[]): Promise<Record<string, any>> {
        try {
            const result: Record<string, any> = {};
            await Promise.all(
                keys.map(async key => {
                    const value = await this.operations.get(key);
                    if (value !== null) {
                        result[key] = value;
                    }
                })
            );
            return result;
        } catch (error) {
            this.validation.handleError('getMany', error as Error, {keys});
            return {};
        }
    }

    /**
     * Set multiple values in cache
     */
    async setMany(entries: Record<string, any>, options?: CacheOptions): Promise<void> {
        try {
            await Promise.all(
                Object.entries(entries).map(([key, value]) => 
                    this.operations.set(key, value, options)
                )
            );
        } catch (error) {
            this.validation.handleError('setMany', error as Error, {entries});
        }
    }
}