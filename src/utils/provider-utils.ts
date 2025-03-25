/**
 * @fileoverview Utility functions for working with cache providers
 * 
 * This module provides helper functions to safely interact with cache providers,
 * handle error conditions, and create specialized provider wrappers.
 * 
 * @module utils/provider-utils
 */

import {ICacheProvider} from '../interfaces/i-cache-provider';
import {CacheErrorCode, createCacheError} from './error-utils';

/**
 * Checks if a provider implements a specific method
 * 
 * @param {ICacheProvider} provider - Cache provider to check
 * @param {keyof ICacheProvider} methodName - Name of the method to verify
 * @returns {boolean} True if the provider has the specified method
 * 
 * @example
 * ```typescript
 * if (providerHasMethod(myProvider, 'invalidateByTag')) {
 *   await myProvider.invalidateByTag('someTag');
 * }
 * ```
 */
export function providerHasMethod(provider: ICacheProvider, methodName: keyof ICacheProvider): boolean {
    if (!provider) {
        return false;
    }
    
    return typeof provider[methodName] === 'function';
}

/**
 * Safely calls a provider method and handles any errors with consistent error reporting
 * 
 * @template T Return type of the provider method
 * @param {ICacheProvider} provider - Cache provider instance
 * @param {keyof ICacheProvider} methodName - Name of the method to call
 * @param {...any[]} args - Arguments to pass to the method
 * @returns {Promise<T | null>} Result of the method call or null if error occurs
 * @throws {CacheError} Enhanced error with context information
 * 
 * @example
 * ```typescript
 * const value = await safelyCallProviderMethod(provider, 'get', 'my-key');
 * ```
 */
export async function safelyCallProviderMethod<T>(
    provider: ICacheProvider,
    methodName: keyof ICacheProvider,
    ...args: any[]
): Promise<T | null> {
    try {
        if (!provider) {
            throw createCacheError(
                'Provider not available',
                CacheErrorCode.NO_PROVIDER
            );
        }
        
        if (!providerHasMethod(provider, methodName)) {
            // If the method doesn't exist, return null
            return null;
        }
        
        // Call the method with the provided arguments
        const method = provider[methodName] as (...methodArgs: any[]) => Promise<T>;
        return await method(...args);
    } catch (error) {
        // Rethrow with enhanced error information
        throw createCacheError(
            `Error calling method "${String(methodName)}" on provider "${provider.name || 'unknown'}": ${(error as Error)?.message || String(error)}`,
            CacheErrorCode.PROVIDER_ERROR,
            { 
                error: error instanceof Error ? error : undefined,
                methodName, 
                provider: provider.name 
            }
        );
    }
}

/**
 * Gets a provider's display name with fallback to a default if not available
 * 
 * @param {ICacheProvider} provider - Cache provider instance
 * @returns {string} Provider name or default value if not available
 * 
 * @example
 * ```typescript
 * const name = getProviderName(provider);
 * console.log(`Using cache provider: ${name}`);
 * ```
 */
export function getProviderName(provider: ICacheProvider): string {
    if (!provider) {
        return 'unknown';
    }
    
    return provider.name || 'unnamed-provider';
}

/**
 * Checks if a provider supports a specific operation/feature
 * 
 * @param {ICacheProvider} provider - Cache provider to check
 * @param {string} operation - Operation name to verify
 * @returns {boolean} True if the provider supports the operation
 * 
 * @example
 * ```typescript
 * if (providerSupportsOperation(provider, 'invalidateByTag')) {
 *   // Use the tag invalidation feature
 * } else {
 *   // Use an alternative approach
 * }
 * ```
 */
export function providerSupportsOperation(provider: ICacheProvider, operation: string): boolean {
    if (!provider) {
        return false;
    }
    
    return typeof provider[operation as keyof ICacheProvider] === 'function';
}

/**
 * Creates a minimal fallback provider that can be used when regular providers are unavailable
 * 
 * @returns {ICacheProvider} A minimal no-op provider implementation
 * 
 * @example
 * ```typescript
 * const provider = availableProvider || createFallbackProvider();
 * ```
 */
export function createFallbackProvider(): ICacheProvider {
    return {
        name: 'fallback',
        get: async () => null,
        set: async () => {},
        delete: async () => false,
        clear: async () => {},
        has: async () => false,
        getStats: async () => ({
            hits: 0,
            misses: 0,
            size: 0,
            keyCount: 0,
            memoryUsage: 0,
            lastUpdated: Date.now()
        })
    };
}

/**
 * Creates a safety wrapper around a provider that catches all errors
 * and handles them with the provided error handler
 * 
 * @param {ICacheProvider} provider - Original provider to wrap
 * @param {Function} errorHandler - Function to call when an error occurs
 * @returns {ICacheProvider} Proxied provider with error handling
 * 
 * @example
 * ```typescript
 * const safeProvider = createSafeProvider(redisProvider, (error, context) => {
 *   logger.error('Redis error:', error, context);
 * });
 * ```
 */
export function createSafeProvider(
    provider: ICacheProvider,
    errorHandler: (error: unknown, context: Record<string, any>) => void
): ICacheProvider {
    const handler = {
        get(target: ICacheProvider, prop: string | symbol): any {
            const originalMethod = target[prop as keyof ICacheProvider];
            
            // Only proxy methods
            if (typeof originalMethod !== 'function') {
                return originalMethod;
            }
            
            // Return a wrapper function that catches errors
            return async (...args: any[]): Promise<any> => {
                try {
                    return await originalMethod.apply(target, args);
                } catch (error) {
                    errorHandler(error, {
                        provider: target.name,
                        operation: prop.toString(),
                        arguments: args
                    });
                    
                    // Default return values for common methods
                    switch (prop) {
                        case 'get':
                        case 'getMany':
                            return null;
                        case 'delete':
                        case 'has':
                            return false;
                        case 'getStats':
                            return {
                                hits: 0,
                                misses: 0,
                                size: 0,
                                keyCount: 0,
                                memoryUsage: 0,
                                lastUpdated: Date.now()
                            };
                        case 'keys':
                            return [];
                        default:
                            return undefined;
                    }
                }
            };
        }
    };
    
    return new Proxy(provider, handler);
}

/**
 * Creates a chained provider that attempts operations on multiple providers
 * in sequence until one succeeds
 * 
 * @param {ICacheProvider[]} providers - List of cache providers in priority order
 * @returns {ICacheProvider} Chained provider that implements fallback behavior
 * 
 * @example
 * ```typescript
 * const chainedProvider = createProviderChain([
 *   memoryProvider,
 *   redisProvider,
 *   diskProvider
 * ]);
 * ```
 */
export function createProviderChain(providers: ICacheProvider[]): ICacheProvider {
    if (providers.length === 0) {
        return createFallbackProvider();
    }
    
    if (providers.length === 1) {
        return providers[0];
    }

    return {
        name: 'chained',

        async get<T>(key: string): Promise<T | null> {
            for (const provider of providers) {
                try {
                    const value = await provider.get<T>(key);
                    if (value !== null) {
                        return value;
                    }
                } catch (error) {
                    console.warn(`Error getting key "${key}" from provider "${provider.name}":`, error);
                    // Continue to next provider
                }
            }
            return null;
        },

        async set<T>(key: string, value: T, options?: any): Promise<void> {
            for (const provider of providers) {
                try {
                    await provider.set(key, value, options);
                    return;
                } catch (error) {
                    console.warn(`Error setting key "${key}" in provider "${provider.name}":`, error);
                    // Continue to next provider
                }
            }
        },

        async delete(key: string): Promise<boolean> {
            let deleted = false;
            for (const provider of providers) {
                try {
                    const result = await provider.delete(key);
                    deleted = deleted || result;
                } catch (error) {
                    console.warn(`Error deleting key "${key}" from provider "${provider.name}":`, error);
                }
            }
            return deleted;
        },

        async clear(): Promise<void> {
            for (const provider of providers) {
                try {
                    await provider.clear();
                } catch (error) {
                    console.warn(`Error clearing provider "${provider.name}":`, error);
                }
            }
        },

        async has(key: string): Promise<boolean> {
            for (const provider of providers) {
                try {
                    const exists = await provider.has(key);
                    if (exists) {
                        return true;
                    }
                } catch (error) {
                    console.warn(`Error checking key "${key}" in provider "${provider.name}":`, error);
                }
            }
            return false;
        }
    };
}
