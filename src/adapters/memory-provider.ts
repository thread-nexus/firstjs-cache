/**
 * Memory cache provider implementation
 */
import {CacheOptions, CacheStats} from '../types';
import {ICacheProvider} from '../interfaces/i-cache-provider';
import {MemoryAdapter} from './memory-adapter';
import {CacheEventType} from '../events/cache-events';
import {eventManager} from '../events/event-manager';
import {logger} from '../utils/logger';
import {metrics} from '../utils/metrics';
import { handleCacheError, CacheErrorCode, createCacheError } from '../utils/error-handling';

/**
 * Common event data for cache operations
 */
interface CacheEventData {
    key?: string;
    keys?: string[];
    provider: string;
    duration?: number;
    timestamp: number;
    error?: Error;
    hits?: number;
    misses?: number;
}

/**
 * Memory provider options
 */
export interface MemoryProviderOptions {
    /**
     * Maximum cache size in bytes
     */
    maxSize?: number;
    /**
     * Maximum number of items
     */
    maxItems?: number;
    /**
     * Default TTL in seconds
     */
    defaultTtl?: number;
    /**
     * Whether to update item age on get
     */
    updateAgeOnGet?: boolean;
    /**
     * Whether to return stale items
     */
    allowStale?: boolean;
    /**
     * Name for this provider
     */
    name?: string;
}

/**
 * Memory cache provider
 */
export class MemoryProvider implements ICacheProvider {
    /**
     * Provider name
     */
    public name: string;

    /**
     * Memory adapter instance
     */
    private adapter: MemoryAdapter;

    /**
     * Cache statistics
     */
    private stats = {
        hits: 0,
        misses: 0,
        operations: 0,
        lastUpdated: Date.now()
    };

    /**
     * Add a timestamp for tracking last size metrics update
     */
    private lastSizeUpdate: number = 0;
    options: any;

    /**
     * Create a new memory cache provider
     */
    constructor(options: MemoryProviderOptions = {}) {
        this.name = options.name || 'memory';
        this.adapter = new MemoryAdapter({
            maxSize: options.maxSize,
            maxItems: options.maxItems,
            defaultTtl: options.defaultTtl,
            updateAgeOnGet: options.updateAgeOnGet,
            allowStale: options.allowStale,
            name: this.name
        });
    }

    /**
     * Get a value from the cache
     */
    async get<T = any>(key: string): Promise<T | null> {
        return this.executeOperation(async () => {
            const timerId = metrics.startTimer('memory_cache.get');
            const value = await this.adapter.get(key);
            
            // Update metrics based on result
            metrics.stopTimer(timerId, {
                result: value !== null ? 'hit' : 'miss'
            });
            
            this.updateCacheHitStats(value !== null);

            // Log and emit event based on result
            if (value !== null) {
                logger.debug(`Memory cache hit: ${key}`, {
                    provider: this.name,
                    operation: 'get'
                });
                
                this.logCacheEvent(
                    CacheEventType.GET_HIT,
                    { key }
                );
            } else {
                logger.debug(`Memory cache miss: ${key}`, {
                    provider: this.name,
                    operation: 'get'
                });
                
                this.logCacheEvent(
                    CacheEventType.GET_MISS,
                    { key }
                );
            }
            
            // Track cache size metrics
            this.updateCacheSizeMetrics();

            return value;
        }, { key });
    }

    /**
     * Set a value in the cache
     */
    async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
        return this.executeOperation(async () => {
            await this.adapter.set(key, value, options);
            this.incrementOperationCount();
            this.logCacheEvent(CacheEventType.SET, { key });
        }, { key }, true);
    }

    /**
     * Delete a value from the cache
     */
    async delete(key: string): Promise<boolean> {
        return this.executeOperation(async () => {
            const result = await this.adapter.delete(key);
            this.incrementOperationCount();
            this.logCacheEvent(CacheEventType.DELETE, { key });
            return result;
        }, { key }, false);
    }

    /**
     * Clear all values from the cache
     */
    async clear(): Promise<void> {
        return this.executeOperation(async () => {
            await this.adapter.clear();
            this.incrementOperationCount();
            this.logCacheEvent(CacheEventType.CLEAR, {});
        }, {}, true);
    }

    /**
     * Check if a key exists in the cache
     */
    async has(key: string): Promise<boolean> {
        return this.executeOperation(async () => {
            return await this.adapter.has(key);
        }, { key }, false);
    }

    /**
     * Get multiple values from the cache
     */
    async getMany<T = any>(keys: string[]): Promise<Map<string, T>> {
        return this.executeOperation(async () => {
            const result = new Map<string, T>();

            for (const key of keys) {
                const value = await this.get<T>(key);
                if (value !== null) {
                    result.set(key, value);
                }
            }

            // Update stats
            const hits = Array.from(result.values()).filter(v => v !== null).length;
            const misses = keys.length - hits;
            this.stats.hits += hits;
            this.stats.misses += misses;
            this.incrementOperationCount();

            this.logCacheEvent(CacheEventType.GET_MANY, { keys, hits, misses });
            return result;
        }, { keys }, this.createEmptyResultMap(keys));
    }

    /**
     * Set multiple values in the cache
     */
    async setMany<T = any>(entries: Map<string, T>, options: CacheOptions = {}): Promise<void> {
        return this.executeOperation(async () => {
            for (const [key, value] of entries.entries()) {
                await this.set(key, value, options);
            }
            this.incrementOperationCount();
            this.logCacheEvent(CacheEventType.SET_MANY, { keys: Array.from(entries.keys()) });
        }, { keys: Array.from(entries.keys()) }, true);
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<CacheStats> {
        try {
            // Check if adapter has getStats method
            if (typeof this.adapter.getStats === 'function') {
                const adapterStats = await this.adapter.getStats();
                return {
                    ...adapterStats,
                    // Add additional calculated stats
                    hits: this.stats.hits,
                    misses: this.stats.misses,
                    lastUpdated: Date.now()
                };
            }
            
            // Fallback if the adapter doesn't have getStats
            const size = this.adapter.size ? await this.adapter.size() : 0;
            const keys = this.adapter.keys ? await this.adapter.keys() : [];
            
            return {
                hits: this.stats.hits,
                misses: this.stats.misses,
                size: 0, // Size in bytes may not be available
                keyCount: keys.length,
                memoryUsage: process.memoryUsage().heapUsed, // Approximate memory usage
                lastUpdated: Date.now()
            };
        } catch (error) {
            console.error('Error getting memory provider stats:', error);
            return {
                hits: this.stats.hits,
                misses: this.stats.misses,
                size: 0,
                keyCount: 0,
                memoryUsage: 0,
                lastUpdated: Date.now(),
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Execute a cache operation with timing, logging and error handling
     */
    private async executeOperation<U>(
        operation: () => Promise<U>,
        eventData: Partial<CacheEventData>,
        errorReturnValue?: any
    ): Promise<U> {
        try {
            const start = Date.now();
            const result = await operation();
            const duration = Date.now() - start;

            return result;
        } catch (error) {
            // Use enhanced error handling
            const cacheError = handleCacheError(error, {
                operation: 'unknown',
                provider: this.name,
                key: eventData.key
            });
            
            this.logCacheEvent(CacheEventType.ERROR, {
                ...eventData,
                error: cacheError
            });

            if (errorReturnValue !== undefined) {
                return errorReturnValue;
            }
            throw cacheError;
        }
    }

    /**
     * Update cache hit/miss statistics
     */
    private updateCacheHitStats(isHit: boolean): void {
        if (isHit) {
            this.stats.hits++;
        } else {
            this.stats.misses++;
        }
        this.stats.operations++;
    }

    /**
     * Increment the operations counter
     */
    private incrementOperationCount(): void {
        this.stats.operations++;
    }

    /**
     * Create an empty result map for getMany error fallback
     */
    private createEmptyResultMap<U>(keys: string[]): Map<string, U | null> {
        return keys.reduce((acc, key) => {
            acc.set(key, null);
            return acc;
        }, new Map<string, U | null>());
    }

    /**
     * Log a cache event with timing information
     */
    private logCacheEvent(
        eventType: CacheEventType,
        data: Partial<CacheEventData>,
        duration?: number
    ): void {
        eventManager.emit(eventType, {
            ...data,
            provider: this.name,
            duration,
            timestamp: Date.now()
        });
    }

    /**
     * Update cache size metrics
     */
    private updateCacheSizeMetrics(): void {
        // Only update periodically to avoid performance impact
        const now = Date.now();
        if (now - this.lastSizeUpdate < 60000) { // Once per minute
            return;
        }
        
        this.lastSizeUpdate = now;
        
        try {
            // Get current memory usage
            let memoryUsage = 0;
            let keyCount = 0;
            
            if (this.adapter.getStats) {
                const stats = this.adapter.getStats();
                memoryUsage = stats.size || 0;
                keyCount = stats.keyCount || 0;
            }
            
            // Report usage metrics
            metrics.gauge('memory_cache.size_bytes', memoryUsage, {
                provider: this.name
            });
            
            metrics.gauge('memory_cache.key_count', keyCount, {
                provider: this.name
            });
            
            // Check if we're approaching memory limits
            if (this.options.maxSize && memoryUsage > this.options.maxSize * 0.8) {
                logger.warn(`Memory cache approaching size limit`, {
                    provider: this.name,
                    currentSize: memoryUsage,
                    maxSize: this.options.maxSize,
                    percentUsed: (memoryUsage / this.options.maxSize) * 100
                });
            }
            
            if (this.options.maxItems && keyCount > this.options.maxItems * 0.8) {
                logger.warn(`Memory cache approaching item limit`, {
                    provider: this.name,
                    currentItems: keyCount,
                    maxItems: this.options.maxItems,
                    percentUsed: (keyCount / this.options.maxItems) * 100
                });
            }
        } catch (error) {
            logger.error(`Error updating cache size metrics`, {
                provider: this.name, 
                error: error instanceof Error ? error.message : String(error)
            });
        }
    }
}