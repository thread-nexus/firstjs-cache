import {useCallback, useEffect, useState} from 'react';
import {CacheOptions} from '../types';
import {CacheManagerCore} from '../implementations';

// Default cache instance
const defaultCacheManager = new CacheManagerCore();

/**
 * Hook options
 */
interface UseCacheOptions<T = any> {
    /**
     * Initial value
     */
    initialValue?: T | null;

    /**
     * Cache options
     */
    options?: CacheOptions;

    /**
     * Auto-fetch on mount
     */
    autoFetch?: boolean;

    /**
     * Custom cache manager
     */
    cacheManager?: CacheManagerCore;
}

/**
 * Hook to use cache in React components
 */
export function useCache<T = any>(key: string, fetcher?: () => Promise<T>, options?: UseCacheOptions<T>) {
    const [value, setValue] = useState<T | null>(options?.initialValue || null);
    const [error, setError] = useState<Error | null>(null);
    const [loading, setLoading] = useState<boolean>(!!fetcher && (options?.autoFetch !== false));

    // Use provided cache manager or default
    const cacheManager = options?.cacheManager || defaultCacheManager;

    // Fetch value from cache or source
    const fetchValue = useCallback(async () => {
        if (!key) return null;

        try {
            setLoading(true);
            setError(null);

            // Try to get from cache
            let value = await cacheManager.get<T>(key);

            // If not in cache and fetcher provided, fetch and cache
            if (value === null && fetcher) {
                const fetchedValue = await fetcher();
                if (fetchedValue !== undefined) {
                    await cacheManager.set(key, fetchedValue, options?.options);
                }
                value = await cacheManager.get<T>(key);
            }

            setValue(value);
            return value;
        } catch (err) {
            const cacheError = err instanceof Error ? err : new Error(String(err));
            setError(cacheError);
            return null;
        } finally {
            setLoading(false);
        }
    }, [key, fetcher, options?.options, cacheManager]);

    // Update cache value
    const updateValue = useCallback(async (value: T) => {
        if (!key) return;

        try {
            await cacheManager.set(key, value, options?.options);
            setValue(value);
        } catch (err) {
            const cacheError = err instanceof Error ? err : new Error(String(err));
            setError(cacheError);
        }
    }, [key, options?.options, cacheManager]);

    // Remove from cache
    const removeValue = useCallback(async () => {
        if (!key) return;

        try {
            await cacheManager.delete(key);
            setValue(null);
        } catch (err) {
            const cacheError = err instanceof Error ? err : new Error(String(err));
            setError(cacheError);
        }
    }, [key, cacheManager]);

    // Fetch multiple values
    const fetchMany = useCallback(async <U = any>(keys: string[]): Promise<Record<string, U | null>> => {
        try {
            const results: Record<string, U | null> = {};

            // Get values in parallel
            await Promise.all(
                keys.map(async (key) => {
                    results[key] = await cacheManager.get<U>(key);
                })
            );

            return results;
        } catch (err) {
            const cacheError = err instanceof Error ? err : new Error(String(err));
            setError(cacheError);
            return {};
        }
    }, [cacheManager]);

    // Set multiple values
    const setMany = useCallback(async <U = any>(entries: Record<string, U>): Promise<void> => {
        try {
            // Set values in parallel
            await Promise.all(
                Object.entries(entries).map(async ([key, value]) => {
                    await cacheManager.set(key, value, options?.options);
                })
            );
        } catch (err) {
            const cacheError = err instanceof Error ? err : new Error(String(err));
            setError(cacheError);
        }
    }, [options?.options, cacheManager]);

    // Fetch on mount if autoFetch is true
    useEffect(() => {
        if (fetcher && options?.autoFetch !== false) {
            fetchValue();
        }
    }, [fetchValue, fetcher, options?.autoFetch]);

    return {
        value,
        setValue: updateValue,
        error,
        loading,
        remove: removeValue,
        refresh: fetchValue,
        fetchMany,
        setMany,
    };
}

export default useCache;