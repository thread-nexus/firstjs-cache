/**
 * @fileoverview Utilities for generating and managing cache keys
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */

import { createHash } from 'crypto';
/**
 * Generate a cache key from a query name and parameters
 * 
 * @param queryName - Name of the query
 * @param params - Query parameters
 * @returns Cache key
 */
export function generateQueryKey(
  queryName: string,
  params?: Record<string, any>
): string {
  if (!params || Object.keys(params).length === 0) {
    return `query:${queryName}`;
  }

  // Sort keys to ensure consistent key generation
  const sortedParams = Object.keys(params)
    .sort()
    .reduce<Record<string, any>>((acc, key) => {
      acc[key] = params[key];
      return acc;
    }, {});

  // Create a deterministic string representation
  const paramsString = JSON.stringify(sortedParams);
  
  // For long parameter strings, use a hash
  if (paramsString.length > 64) {
    const hash = createHash('md5')
      .update(paramsString)
      .digest('hex');
    return `query:${queryName}:${hash}`;
  }
  
  return `query:${queryName}:${paramsString}`;
}
/**
 * Parse a query key into its components
 * 
 * @param key - Query key to parse
 * @returns Parsed components or null if not a valid query key
 */
export function parseQueryKey(
  key: string
): { name: string; paramsHash?: string } | null {
  if (!key.startsWith('query:')) {
    return null;
  }
  const parts = key.split(':');
  if (parts.length === 2) {
    return { name: parts[1] };
  }

  if (parts.length === 3) {
    return { name: parts[1], paramsHash: parts[2] };
  }
  
  return null;
}

/**
 * Generate a namespace-prefixed key
 * 
 * @param namespace - Key namespace
 * @param key - Original key
 * @returns Namespaced key
 */
export function namespacedKey(namespace: string, key: string): string {
  return `${namespace}:${key}`;
}

/**
 * Check if a key belongs to a namespace
 * 
 * @param namespace - Namespace to check
 * @param key - Key to check
 * @returns Whether the key belongs to the namespace
 */
export function isInNamespace(namespace: string, key: string): boolean {
  return key.startsWith(`${namespace}:`);
}

/**
 * Extract the base key from a namespaced key
 * 
 * @param namespacedKey - Namespaced key
 * @returns Base key without namespace
 */
export function extractBaseKey(namespacedKey: string): string {
  const parts = namespacedKey.split(':');
  return parts.slice(1).join(':');
}
