/**
 * @fileoverview Advanced cache operations implementation
 */
import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheOptions } from '../types/common';
/**
 * Advanced cache operations implementation
 */
export declare class CacheManagerOperations {
    private provider;
    /**
     * Create a new cache operations manager
     *
     * @param provider - Primary cache provider
     */
    constructor(provider: ICacheProvider);
    /**
     * Update specific fields in a cached object
     *
     * @param key - Cache key
     * @param fields - Fields to update
     * @param options - Cache options
     * @returns Updated object or false if operation failed
     */
    updateFields(key: string, fields: Record<string, any>, options?: CacheOptions): Promise<Record<string, any> | boolean>;
    /**
     * Append items to an array in the cache
     *
     * @param key - Cache key
     * @param items - Items to append
     * @param options - Cache options
     * @returns Updated array or true if operation succeeded
     */
    arrayAppend(key: string, items: any[], options?: CacheOptions & {
        maxLength?: number;
    }): Promise<any[] | boolean>;
    /**
     * Remove items from an array in the cache
     *
     * @param key - Cache key
     * @param predicate - Function to determine which items to remove
     * @param options - Cache options
     * @returns Updated array or -1 if operation failed
     */
    arrayRemove<T>(key: string, predicate: (item: T) => boolean, options?: CacheOptions): Promise<any[] | number>;
    /**
     * Increment a numeric value in the cache
     *
     * @param key - Cache key
     * @param increment - Amount to increment (default: 1)
     * @param options - Cache options
     * @returns New value after increment, or null if operation failed
     */
    increment(key: string, increment?: number, options?: CacheOptions): Promise<number | null>;
    /**
     * Decrement a numeric value in the cache
     *
     * @param key - Cache key
     * @param decrement - Amount to decrement (default: 1)
     * @param options - Cache options
     * @returns New value after decrement, or null if operation failed
     */
    decrement(key: string, decrement?: number, options?: CacheOptions): Promise<number | null>;
    /**
     * Get and set a value atomically
     *
     * @param key - Cache key
     * @param value - New value to set
     * @param options - Cache options
     * @returns Previous value, or null if not found
     */
    getAndSet<T>(key: string, value: T, options?: CacheOptions): Promise<T | null>;
    /**
     * Set a value only if the key doesn't exist
     *
     * @param key - Cache key
     * @param value - Value to set
     * @param options - Cache options
     * @returns Whether the value was set
     */
    setIfNotExists<T>(key: string, value: T, options?: CacheOptions): Promise<boolean>;
    /**
     * Perform set operations on arrays
     *
     * @param key - Cache key
     * @param operation - Set operation (union, intersection, difference)
     * @param items - Items for the operation
     * @param options - Cache options
     * @returns Result of the set operation
     */
    setOperations<T>(key: string, operation: 'union' | 'intersection' | 'difference', items: T[], options?: CacheOptions): Promise<T[]>;
    /**
     * Batch get multiple keys
     *
     * @param keys - Keys to get
     * @returns Object with values keyed by cache key
     */
    batchGet<T>(keys: string[]): Promise<Record<string, T | null>>;
    /**
     * Batch set multiple key-value pairs
     *
     * @param entries - Key-value pairs to set
     * @param options - Cache options
     */
    batchSet<T>(entries: Record<string, T>, options?: CacheOptions): Promise<void>;
    /**
     * Get multiple values from cache
     */
    getMany<T>(keys: string[]): Promise<Record<string, T | null>>;
    /**
     * Set multiple values in cache
     */
    setMany<T>(entries: Record<string, T>, options?: CacheOptions): Promise<void>;
    /**
     * Execute a transaction of operations
     *
     * @param operations - Operations to execute
     * @param options - Transaction options
     * @returns Results of operations that return values
     */
    transaction(operations: Array<{
        type: 'get' | 'set' | 'delete' | 'has';
        key: string;
        value?: any;
        options?: CacheOptions;
    }>, options?: {
        atomic?: boolean;
    }): Promise<any[]>;
    /**
     * Execute an atomic operation on a cache value
     *
     * @param key - Cache key
     * @param operation - Operation to execute
     * @param options - Cache options
     * @returns Result of the operation
     */
    atomic<T, R>(key: string, operation: (value: T | null) => R | Promise<R>, options?: CacheOptions): Promise<R>;
}
