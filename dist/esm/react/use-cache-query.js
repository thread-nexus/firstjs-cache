/**
 * @fileoverview React hooks for cache integration
 */
import { useEffect, useCallback, useRef, useState } from 'react';
import { CacheEventType, subscribeToCacheEvents } from '../events/cache-events';
import { CacheManagerCore } from '../implementations';
/**
 * React hook for cache queries with advanced features
 */
export function useCacheQuery(key, fetcher, options = {}) {
    const cache = useRef();
    const [data, setData] = useState(options.initialData || null);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(!options.initialData);
    const [isStale, setIsStale] = useState(false);
    // Initialize cache manager
    useEffect(() => {
        if (!cache.current) {
            cache.current = new CacheManagerCore();
        }
    }, []);
    // Fetch data function
    const fetchData = useCallback(async () => {
        if (!cache.current)
            return;
        try {
            setIsLoading(true);
            // Cast options to any to bypass type-checking for now
            const result = await cache.current.getOrCompute(key, fetcher, options);
            setData(result);
            setError(null);
            options.onSuccess?.(result);
        }
        catch (err) {
            setError(err);
            options.onError?.(err);
        }
        finally {
            setIsLoading(false);
        }
    }, [key, fetcher, options]);
    // Subscribe to cache events
    useEffect(() => {
        const unsubscribe = subscribeToCacheEvents(CacheEventType.SET, (event) => {
            if (event.key === key) {
                setData(event.value);
                setIsStale(false);
            }
        });
        return () => unsubscribe();
    }, [key]);
    // Handle background refresh
    useEffect(() => {
        if (!options?.backgroundRefresh)
            return;
        // Use event type all and filter instead of specific event type
        const unsubscribe = subscribeToCacheEvents('all', (event) => {
            if (event.type === 'refresh:start' && event.key === key) {
                setIsStale(true);
            }
        });
        return () => unsubscribe();
    }, [key, options?.backgroundRefresh]);
    // Handle revalidation on focus
    useEffect(() => {
        if (!options.revalidateOnFocus)
            return;
        const onFocus = () => {
            fetchData().then(r => { });
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [fetchData, options.revalidateOnFocus]);
    // Handle revalidation on reconnect
    useEffect(() => {
        if (!options.revalidateOnReconnect)
            return;
        const onOnline = () => {
            fetchData().then(r => { });
        };
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [fetchData, options.revalidateOnReconnect]);
    // Handle polling
    useEffect(() => {
        if (!options.pollingInterval)
            return;
        const interval = setInterval(() => {
            fetchData().then(r => { });
        }, options.pollingInterval);
        return () => clearInterval(interval);
    }, [fetchData, options.pollingInterval]);
    // Initial fetch
    useEffect(() => {
        fetchData().then(r => { });
    }, [fetchData]);
    // Mutate function for optimistic updates
    const mutate = useCallback(async (updater) => {
        if (!cache.current)
            return;
        const newData = typeof updater === 'function'
            ? updater(data)
            : updater;
        setData(newData);
        try {
            // Cast options to any to bypass type-checking for now
            await cache.current.set(key, newData, options);
        }
        catch (err) {
            // Revert on error
            setData(data);
            throw err;
        }
    }, [key, data, options]);
    // If suspend option is enabled, throw promise while loading
    if (options.suspend && isLoading) {
        throw fetchData();
    }
    return {
        data,
        isLoading,
        error,
        isStale,
        refresh: fetchData,
        mutate
    };
}
//# sourceMappingURL=use-cache-query.js.map