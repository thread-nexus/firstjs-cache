/**
 * @fileoverview High-performance cache key management utilities
 * with optimized key generation, validation, and pattern matching.
 */

import { DocCategory, DocPriority, PerformanceImpact } from '../docs/types';

// Optimization: Pre-compile common regular expressions
const INVALID_CHARS_REGEX = /[^a-zA-Z0-9_:.-]/g;
const MULTIPLE_COLONS_REGEX = /:{2,}/g;
const KEY_PATTERN_REGEX = /^([^:]+):(.+)$/;

// LRU cache for compiled patterns
const patternCache = new Map<string, RegExp>();
const MAX_PATTERN_CACHE_SIZE = 100;

/**
 * Generate a cache key with namespace
 * 
 * @param namespace - Key namespace
 * @param parts - Additional key parts
 * @returns Generated cache key
 * 
 * @complexity Time: O(n) where n is total length of parts
 * @category Core
 * @priority Critical
 * 
 * @example
 * ```typescript
 * const key = generateKey('user', 123, 'profile');
 * // Result: "user:123:profile"
 * ```
 */
export function generateKey(namespace: string, ...parts: any[]): string {
  // Validate namespace
  if (!namespace) {
    throw new Error('Namespace is required');
  }

  // Convert parts to strings and normalize
  const keyParts = [namespace.toLowerCase()].concat(
    parts.map(part => 
      typeof part === 'string' ? part : JSON.stringify(part)
    )
  );

  // Join with colons and normalize
  return normalizeKey(keyParts.join(':'));
}

/**
 * Generate a function cache key
 * 
 * @param functionName - Name of the function
 * @param args - Function arguments
 * @param options - Additional options
 * @returns Generated cache key
 * 
 * @complexity Time: O(n) where n is size of args
 * @category Core
 * @priority High
 */
export function generateFunctionKey(
  functionName: string,
  args: any[],
  options?: Record<string, any>
): string {
  const argsKey = JSON.stringify(args);
  const optionsKey = options ? `:${JSON.stringify(options)}` : '';
  return normalizeKey(`fn:${functionName}:${argsKey}${optionsKey}`);
}

/**
 * Generate a query cache key
 * 
 * @param queryName - Name of the query
 * @param params - Query parameters
 * @returns Generated cache key
 * 
 * @complexity Time: O(n) where n is size of params
 * @category Core
 * @priority High
 */
export function generateQueryKey(
  queryName: string,
  params?: Record<string, any>
): string {
  return params 
    ? normalizeKey(`query:${queryName}:${JSON.stringify(params)}`)
    : normalizeKey(`query:${queryName}`);
}

/**
 * Parse a cache key into its components
 * 
 * @param key - Cache key to parse
 * @returns Parsed key components
 * 
 * @complexity Time: O(1)
 * @category Utils
 * @priority Medium
 * 
 * @example
 * ```typescript
 * const { namespace, parts } = parseKey('user:123:profile');
 * // Result: { namespace: 'user', parts: ['123', 'profile'] }
 * ```
 */
export function parseKey(key: string): {
  namespace: string;
  parts: string[];
} {
  const match = KEY_PATTERN_REGEX.exec(key);
  if (!match) {
    throw new Error('Invalid key format');
  }

  return {
    namespace: match[1]!,
    parts: match[2]!.split(':')
  };
}

/**
 * Create a key prefix for pattern matching
 * 
 * @param namespace - Key namespace
 * @param parts - Additional prefix parts
 * @returns Key prefix pattern
 * 
 * @complexity Time: O(n) where n is total length of parts
 * @category Utils
 * @priority Medium
 */
export function createKeyPrefix(namespace: string, ...parts: string[]): string {
  return `${namespace}:${parts.join(':')}:*`;
}

/**
 * Create a key pattern for regex matching with caching
 * 
 * @param pattern - Pattern string
 * @returns Compiled RegExp
 * 
 * @complexity Time: O(1) with cache, O(n) without
 * @category Utils
 * @priority High
 */
export function createKeyPattern(pattern: string): RegExp {
  // Check pattern cache first
  let regex = patternCache.get(pattern);
  if (regex) {
    return regex;
  }

  // Create new pattern
  const escaped = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*/g, '.*'); // Fix: Use global regex to replace all occurrences

  regex = new RegExp(`^${escaped}$`);

  // Update pattern cache with LRU behavior
  if (patternCache.size >= MAX_PATTERN_CACHE_SIZE) {
    const firstKey = patternCache.keys().next().value;
    if (firstKey) {
      patternCache.delete(firstKey);
    }
  }
  patternCache.set(pattern, regex);

  return regex;
}

/**
 * Check if a key matches a pattern
 * 
 * @param key - Cache key to check
 * @param pattern - Pattern to match against
 * @returns Whether the key matches the pattern
 * 
 * @complexity Time: O(n) where n is key length
 * @category Utils
 * @priority High
 */
export function keyMatchesPattern(key: string, pattern: string): boolean {
  const regex = createKeyPattern(pattern);
  return regex.test(key);
}

/**
 * Normalize a cache key
 * 
 * @param key - Key to normalize
 * @returns Normalized key
 * 
 * @complexity Time: O(n) where n is key length
 * @category Utils
 * @priority Critical
 */
export function normalizeKey(key: string): string {
  return key
    .replace(INVALID_CHARS_REGEX, '')
    .replace(MULTIPLE_COLONS_REGEX, ':')
    .toLowerCase();
}

/**
 * Generate a unique key with timestamp
 * 
 * @param prefix - Key prefix
 * @returns Generated unique key
 * 
 * @complexity Time: O(1)
 * @category Utils
 * @priority Medium
 */
export function generateUniqueKey(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return normalizeKey(`${prefix}:${timestamp}:${random}`);
}

/**
 * Extract timestamp from a unique key
 * 
 * @param key - Key to extract timestamp from
 * @returns Extracted timestamp or null
 * 
 * @complexity Time: O(1)
 * @category Utils
 * @priority Low
 */
export function extractTimestamp(key: string): number | null {
  const parts = key.split(':');
  if (parts.length < 2) return null;
  
  const timestamp = parseInt(parts[1]!, 10);
  return isNaN(timestamp) ? null : timestamp;
}

// Documentation metadata
export const metadata = {
  category: DocCategory.CORE,
  priority: DocPriority.CRITICAL,
  complexity: {
    time: 'O(1) for most operations, O(n) for pattern matching',
    space: 'O(k) where k is pattern cache size',
    impact: PerformanceImpact.MINIMAL,
    notes: 'Optimized with regex caching and pre-compilation'
  },
  examples: [{
    title: 'Basic Key Generation',
    code: `
      const userKey = generateKey('user', 123, 'profile');
      const queryKey = generateQueryKey('getUsers', { role: 'admin' });
      const uniqueKey = generateUniqueKey('session');
    `,
    description: 'Generate different types of cache keys'
  }],
  since: '1.0.0'
};