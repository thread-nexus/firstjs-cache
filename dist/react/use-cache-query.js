"use strict";
/**
 * @fileoverview React hooks for cache integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCacheQuery = useCacheQuery;
const react_1 = require("react");
const cache_events_1 = require("../events/cache-events");
const implementations_1 = require("../implementations");
/**
 * React hook for cache queries with advanced features
 */
function useCacheQuery(key, fetcher, options = {}) {
    const cache = (0, react_1.useRef)();
    const [data, setData] = (0, react_1.useState)(options.initialData || null);
    const [error, setError] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(!options.initialData);
    const [isStale, setIsStale] = (0, react_1.useState)(false);
    // Initialize cache manager
    (0, react_1.useEffect)(() => {
        if (!cache.current) {
            cache.current = new implementations_1.CacheManagerCore();
        }
    }, []);
    // Fetch data function
    const fetchData = (0, react_1.useCallback)(async () => {
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
    (0, react_1.useEffect)(() => {
        const unsubscribe = (0, cache_events_1.subscribeToCacheEvents)(cache_events_1.CacheEventType.SET, (event) => {
            if (event.key === key) {
                setData(event.value);
                setIsStale(false);
            }
        });
        return () => unsubscribe();
    }, [key]);
    // Handle background refresh
    (0, react_1.useEffect)(() => {
        if (!options?.backgroundRefresh)
            return;
        // Use event type all and filter instead of specific event type
        const unsubscribe = (0, cache_events_1.subscribeToCacheEvents)('all', (event) => {
            if (event.type === 'refresh:start' && event.key === key) {
                setIsStale(true);
            }
        });
        return () => unsubscribe();
    }, [key, options?.backgroundRefresh]);
    // Handle revalidation on focus
    (0, react_1.useEffect)(() => {
        if (!options.revalidateOnFocus)
            return;
        const onFocus = () => {
            fetchData().then(r => { });
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [fetchData, options.revalidateOnFocus]);
    // Handle revalidation on reconnect
    (0, react_1.useEffect)(() => {
        if (!options.revalidateOnReconnect)
            return;
        const onOnline = () => {
            fetchData().then(r => { });
        };
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
    }, [fetchData, options.revalidateOnReconnect]);
    // Handle polling
    (0, react_1.useEffect)(() => {
        if (!options.pollingInterval)
            return;
        const interval = setInterval(() => {
            fetchData().then(r => { });
        }, options.pollingInterval);
        return () => clearInterval(interval);
    }, [fetchData, options.pollingInterval]);
    // Initial fetch
    (0, react_1.useEffect)(() => {
        fetchData().then(r => { });
    }, [fetchData]);
    // Mutate function for optimistic updates
    const mutate = (0, react_1.useCallback)(async (updater) => {
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