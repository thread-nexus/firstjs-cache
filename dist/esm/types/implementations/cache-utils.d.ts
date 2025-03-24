/**
 * @fileoverview Utility functions for cache operations
 */
/**
 * Deep merge two objects
 *
 * @param target - Target object to merge into
 * @param source - Source object to merge from
 * @returns Merged object
 */
export declare function deepMerge(target: any, source: any): any;
/**
 * Generate a cache key from multiple parts
 *
 * @param parts - Parts to include in the cache key
 * @returns Generated cache key
 */
export declare function generateCacheKey(...parts: any[]): string;
/**
 * Safely parse JSON with error handling
 *
 * @param str - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export declare function safeJsonParse<T>(str: string, fallback: T): T;
/**
 * Safely stringify value with error handling
 *
 * @param value - Value to stringify
 * @param fallback - Fallback string if stringification fails
 * @returns JSON string or fallback
 */
export declare function safeJsonStringify(value: any, fallback?: string): string;
