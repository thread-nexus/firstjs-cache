/**
 * @fileoverview Validation utilities for cache operations
 */
import { CacheOptions } from '../types/common';
/**
 * Cache operation context
 */
export interface CacheOperationContext {
    /** Operation name */
    operation?: string;
    /** Cache key */
    key?: string;
    /** List of cache keys */
    keys?: string[];
    /** Cache provider name */
    provider?: string;
    /** Additional context data */
    context?: Record<string, any>;
    /** Optional error cause */
    cause?: Error;
    /** Cache tag */
    tag?: string;
    /** Cache key prefix */
    prefix?: string;
    /** Entries for batch operations */
    entries?: Record<string, any> | string[];
    /** Operation error count */
    errorCount?: number;
    /** Whether the data is compressed */
    compressed?: boolean;
    /** Operation start time */
    startTime?: number;
    /** Operation options */
    options?: any;
    /** Custom properties for specific operations */
    [key: string]: any;
}
/**
 * Validate a cache key
 *
 * @param key - Cache key to validate
 * @throws {CacheError} If key is invalid
 */
export declare function validateCacheKey(key: string): void;
/**
 * Validate cache options
 *
 * @param options - Cache options to validate
 * @throws {CacheError} If options are invalid
 */
export declare function validateCacheOptions(options?: CacheOptions): void;
/**
 * Validate that a value can be cached
 *
 * @param value - Value to validate
 * @throws {CacheError} If value cannot be cached
 */
export declare function validateCacheValue(value: any): void;
