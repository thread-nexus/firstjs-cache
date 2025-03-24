/**
 * Utility functions for cache manager
 */

import {CacheOptions} from '../types';
import {DEFAULT_CONFIG} from '../config/default-config';
import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheManager} from '../core/cache-manager';
import {CacheConfig} from '../interfaces/i-cache-config';

/**
 * Merge cache options with defaults
 *
 * @param options - User options
 * @param defaults - Default options
 * @returns Merged options
 */
export function mergeCacheOptions(
    options: CacheOptions = {},
    defaults: CacheOptions = DEFAULT_CONFIG.defaultOptions
): CacheOptions {
    return {
        ...defaults,
        ...options,
        // Merge tags if both exist
        tags: options.tags && defaults.tags
            ? [...new Set([...defaults.tags, ...options.tags])]
            : options.tags || defaults.tags
    };
}

/**
 * Create a new cache manager
 *
 * @param config - Cache configuration
 * @returns Cache manager instance
 */
export function createCacheManager(config: CacheConfig): CacheManager {
    return new CacheManager(config);
}

/**
 * Check if a provider has a specific method
 *
 * @param provider - Cache provider
 * @param methodName - Method name
 * @returns Whether the provider has the method
 */
export function providerHasMethod(provider: ICacheProvider, methodName: keyof ICacheProvider): boolean {
    return provider && typeof provider[methodName] === 'function';
}

/**
 * Safely call a provider method
 *
 * @param provider - Cache provider
 * @param methodName - Method name
 * @param args - Method arguments
 * @returns Method result or null if method doesn't exist
 */
export async function safelyCallProviderMethod<T>(
    provider: ICacheProvider,
    methodName: keyof ICacheProvider,
    ...args: any[]
): Promise<T | null> {
    if (providerHasMethod(provider, methodName)) {
        try {
            // Type assertion to make TypeScript happy
            const method = provider[methodName] as (...args: any[]) => Promise<T>;
            return await method(...args);
        } catch (error) {
            console.error(`Error calling ${String(methodName)} on provider:`, error);
            return null;
        }
    }
    return null;
}

/**
 * Generate a cache key from a prefix and arguments
 *
 * @param prefix - Key prefix
 * @param args - Arguments to include in key
 * @returns Generated cache key
 */
export function generateCacheKey(prefix: string, args: any[]): string {
    const argString = args.map(arg => {
        if (arg === null) return 'null';
        if (arg === undefined) return 'undefined';
        if (typeof arg === 'function') return 'function';
        if (typeof arg === 'object') return JSON.stringify(arg);
        return String(arg);
    }).join(':');

    return `${prefix}:${argString}`;
}

/**
 * Check if a value should be refreshed based on TTL and threshold
 *
 * @param createdAt - When the value was created
 * @param ttl - Time-to-live in seconds
 * @param threshold - Refresh threshold (0-1)
 * @returns Whether the value should be refreshed
 */
export function shouldRefresh(
    createdAt: number | Date,
    ttl: number,
    threshold: number
): boolean {
    if (!ttl || !threshold || threshold <= 0 || threshold > 1) {
        return false;
    }

    const createdTimestamp = createdAt instanceof Date ? createdAt.getTime() : createdAt;
    const expiresAt = createdTimestamp + (ttl * 1000);
    const refreshAt = createdTimestamp + (ttl * threshold * 1000);

    return Date.now() >= refreshAt && Date.now() < expiresAt;
}

/**
 * Deep merge two objects
 *
 * @param target - Target object
 * @param source - Source object
 * @returns Merged object
 */
export function deepMerge<T>(target: T, source: Partial<T>): T {
    if (!source) return target;
    if (!target) return source as T;

    const result = {...target} as T;

    for (const key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
            const sourceValue = source[key];
            const targetValue = target[key as keyof T];

            if (
                sourceValue &&
                targetValue &&
                typeof sourceValue === 'object' &&
                typeof targetValue === 'object' &&
                !Array.isArray(sourceValue) &&
                !Array.isArray(targetValue)
            ) {
                // Type assertion to make TypeScript happy
                (result as any)[key] = deepMerge(targetValue, sourceValue);
            } else if (sourceValue !== undefined) {
                // Type assertion to make TypeScript happy
                (result as any)[key] = sourceValue;
            }
        }
    }

    return result;
}

/**
 * Format cache size for display
 *
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places
 * @returns Formatted size string
 */
export function formatCacheSize(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}