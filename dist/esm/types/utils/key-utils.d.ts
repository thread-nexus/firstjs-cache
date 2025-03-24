/**
 * @fileoverview Utilities for generating and managing cache keys
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */
/**
 * Generate a cache key from a query name and parameters
 *
 * @param queryName - Name of the query
 * @param params - Query parameters
 * @returns Cache key
 */
export declare function generateQueryKey(queryName: string, params?: Record<string, any>): string;
/**
 * Parse a query key into its components
 *
 * @param key - Query key to parse
 * @returns Parsed components or null if not a valid query key
 */
export declare function parseQueryKey(key: string): {
    name: string;
    paramsHash?: string;
} | null;
/**
 * Generate a namespace-prefixed key
 *
 * @param namespace - Key namespace
 * @param key - Original key
 * @returns Namespaced key
 */
export declare function namespacedKey(namespace: string, key: string): string;
/**
 * Check if a key belongs to a namespace
 *
 * @param namespace - Namespace to check
 * @param key - Key to check
 * @returns Whether the key belongs to the namespace
 */
export declare function isInNamespace(namespace: string, key: string): boolean;
/**
 * Extract the base key from a namespaced key
 *
 * @param namespacedKey - Namespaced key
 * @returns Base key without namespace
 */
export declare function extractBaseKey(namespacedKey: string): string;
