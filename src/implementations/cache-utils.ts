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
export function deepMerge(target: any, source: any): any {
  // Handle null values
  if (source === null) return null;
  if (target === null) return source;
  
  // Handle undefined target
  if (target === undefined) {
    if (Array.isArray(source)) return [...source];
    if (typeof source === 'object') return {...source};
    return source;
  }
  
  // Handle arrays - always replace with source array
  if (Array.isArray(source)) return [...source];
  
  // Handle non-object sources
  if (typeof source !== 'object') return source;
  if (typeof target !== 'object') target = {};
  
  // Create a copy of target to avoid mutation
  const result = {...target};
  
  // Handle object merging
  for (const key in source) {
    // Skip undefined values
    if (source[key] === undefined) continue;
    
    // Use null to delete keys
    if (source[key] === null) {
      result[key] = null;
      continue;
    }
    
    // Recursively merge objects
    if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key], source[key]);
    } else {
      // Arrays and primitives just get replaced
      result[key] = source[key];
    }
  }
  
  return result;
}

/**
 * Generate a cache key from multiple parts
 * 
 * @param parts - Parts to include in the cache key
 * @returns Generated cache key
 */
export function generateCacheKey(...parts: any[]): string {
  return parts.map(part => {
    if (part === null) return 'null';
    if (part === undefined) return 'undefined';
    if (typeof part === 'object') return JSON.stringify(part);
    return String(part);
  }).join(':');
}

/**
 * Safely parse JSON with error handling
 * 
 * @param str - JSON string to parse
 * @param fallback - Fallback value if parsing fails
 * @returns Parsed object or fallback
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str) as T;
  } catch (error) {
    return fallback;
  }
}

/**
 * Safely stringify value with error handling
 * 
 * @param value - Value to stringify
 * @param fallback - Fallback string if stringification fails
 * @returns JSON string or fallback
 */
export function safeJsonStringify(value: any, fallback: string = '{}'): string {
  try {
    return JSON.stringify(value);
  } catch (error) {
    return fallback;
  }
}