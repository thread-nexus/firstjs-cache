/**
 * @fileoverview In-memory storage adapter implementation with LRU caching
 */
import { IStorageAdapter } from '../../interfaces/i-storage-adapter';
import { HealthStatus } from '../../types/common';
/**
 * Configuration options for the memory storage adapter
 */
export interface MemoryStorageOptions {
    maxSize?: number;
    maxItems?: number;
    defaultTtl?: number;
    updateAgeOnGet?: boolean;
    allowStale?: boolean;
}
/**
 * In-memory storage adapter using LRU cache
 */
export declare class MemoryStorageAdapter implements IStorageAdapter {
    name: string;
    private store;
    private metadata;
    private stats;
    private readonly maxSize;
    private readonly maxItems;
    private readonly defaultTtl;
    private readonly updateAgeOnGet;
    /**
     * Create a new memory storage adapter
     */
    constructor(options?: MemoryStorageOptions);
    /**
     * Get a value from the cache
     */
    get<T = any>(key: string): Promise<T | null>;
    /**
     * Set a value in the cache
     */
    set<T = any>(key: string, value: T, options?: {
        ttl?: number;
        tags?: string[];
        compression?: boolean;
        compressionThreshold?: number;
    }): Promise<void>;
    /**
     * Delete a value from the cache
     */
    delete(key: string): Promise<boolean>;
    /**
     * Check if a key exists in the cache
     */
    has(key: string): Promise<boolean>;
    /**
     * Clear all values from the cache
     */
    clear(): Promise<void>;
    /**
     * Get multiple values from the cache
     */
    getMany<T = any>(keys: string[]): Promise<Record<string, T | null>>;
    /**
     * Set multiple values in the cache
     */
    setMany<T = any>(entries: Record<string, T>, options?: {
        ttl?: number;
        tags?: string[];
        compression?: boolean;
        compressionThreshold?: number;
    }): Promise<void>;
    /**
     * Invalidate cache entries by tag
     */
    invalidateByTag(tag: string): Promise<number>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<{
        hits: number;
        misses: number;
        keyCount: number;
        size: number;
        maxSize: number;
    }>;
    /**
     * Get metadata for a key
     */
    getMetadata(key: string): Promise<any | null>;
    /**
     * Calculate the total size of all cache entries
     */
    private calculateTotalSize;
    /**
     * Calculate size of a value
     */
    private calculateSize;
    /**
     * Ensure the cache has capacity for new items
     */
    private ensureCapacity;
    /**
     * Evict least recently used item
     */
    private evictLRU;
    /**
     * Get all keys in the cache
     *
     * @param pattern Optional pattern to match keys against
     * @returns Array of keys
     */
    keys(pattern?: string): Promise<string[]>;
    /**
     * Perform health check
     *
     * @returns Health status
     */
    healthCheck(): Promise<HealthStatus>;
}
