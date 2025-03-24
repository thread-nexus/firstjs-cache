/**
 * @fileoverview Utility functions for cache operations
 */
import { CacheOptions } from '../types/common';
/**
 * Create a cache key with proper prefix
 *
 * @param type - Key type/category
 * @param id - Key identifier
 * @param subtype - Optional subtype
 * @returns Formatted cache key
 */
export declare function createCacheKey(type: string, id: string | number | object, subtype?: string): string;
/**
 * Merge cache options with defaults
 *
 * @param options - User-provided options
 * @param defaults - Default options
 * @returns Merged options
 */
export declare function mergeCacheOptions(options?: Partial<CacheOptions>, defaults?: Partial<CacheOptions>): CacheOptions;
/**
 * Calculate expiration timestamp
 *
 * @param ttl - Time to live in seconds
 * @returns Expiration timestamp or null for no expiration
 */
export declare function calculateExpiration(ttl?: number): number | null;
/**
 * Check if a timestamp is expired
 *
 * @param timestamp - Expiration timestamp
 * @returns True if expired
 */
export declare function isExpired(timestamp: number | null): boolean;
/**
 * Format cache size in human-readable format
 *
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places
 * @returns Formatted size string
 */
export declare function formatCacheSize(bytes: number, decimals?: number): string;
/**
 * Parse duration string (e.g., "5m", "2h") to seconds
 *
 * @param duration - Duration string
 * @returns Duration in seconds
 */
export declare function parseDuration(duration: string): number;
/**
 * Create a key pattern for searching
 *
 * @param type - Key type/category
 * @param pattern - Pattern to match
 * @returns Formatted key pattern
 */
export declare function createKeyPattern(type: string, pattern: string): string;
/**
 * Process operations in batches
 *
 * @param items - Items to process
 * @param operation - Operation to perform on each item
 * @param options - Batch options
 * @returns Results of operations
 */
export declare function batchOperations<T, R>(items: T[], operation: (item: T, index: number) => Promise<R>, options?: {
    batchSize?: number;
    concurrency?: number;
    retries?: number;
    retryDelay?: number;
    onProgress?: (completed: number, total: number) => void;
}): Promise<R[]>;
/**
 * Debounce function calls
 *
 * @param fn - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export declare function debounce<T extends (...args: any[]) => any>(fn: T, wait: number): (...args: T extends ((...args: infer P) => any) ? P : never[]) => void;
/**
 * Throttle function calls
 *
 * @param fn - Function to throttle
 * @param wait - Throttle interval in milliseconds
 * @returns Throttled function
 */
export declare function throttle<T extends (...args: any[]) => any>(fn: T, wait: number): (...args: T extends ((...args: infer P) => any) ? P : never[]) => void;
