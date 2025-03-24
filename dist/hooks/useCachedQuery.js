"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCachedQuery = useCachedQuery;
/**
 * useCachedQuery.ts
 *
 * React hook for data fetching with cache support
 */
const react_1 = require("react");
const use_cache_1 = require("./use-cache"); // Correct path
/**
 * Hook for data fetching with cache support
 *
 * @param key - Cache key or array of values to create a key
 * @param fetchFn - Function to fetch data if not in cache
 * @param options - Query options including cache options
 * @returns Object containing data, loading state, error, and refetch function
 */
function useCachedQuery(key, fetchFn, options = {}) {
    const cacheKey = Array.isArray(key) ? key.join(':') : key;
    const cache = (0, use_cache_1.useCache)(cacheKey);
    const [data, setData] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchData = (0, react_1.useCallback)(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Check cache first unless disabled
            if (!options.disableCache) {
                const cachedData = cache.data;
                if (cachedData !== null) {
                    setData(cachedData);
                    setIsLoading(false);
                    if (options.onSuccess) {
                        options.onSuccess(cachedData);
                    }
                    return;
                }
            }
            // Fetch data
            const result = await fetchFn();
            // Cache the result unless disabled
            if (!options.disableCache) {
                const cacheOptions = {
                    // Only include properties from CacheOptions
                    ttl: options.cacheTime, // Map to appropriate property
                    backgroundRefresh: options.staleWhileRevalidate
                    // Don't include tags if it's not part of the type
                };
                await cache.setValue(result);
            }
            setData(result);
            if (options.onSuccess) {
                options.onSuccess(result);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
            if (options.onError) {
                options.onError(err instanceof Error ? err : new Error(String(err)));
            }
        }
        finally {
            setIsLoading(false);
        }
    }, [cacheKey, fetchFn, cache, options]);
    (0, react_1.useEffect)(() => {
        if (options.skip) {
            setIsLoading(false);
            return;
        }
        fetchData().then(r => { });
    }, [fetchData, options.skip]);
    const refetch = (0, react_1.useCallback)(async () => {
        await fetchData();
    }, [fetchData]);
    return {
        data,
        isLoading,
        error,
        refetch
    };
}
//# sourceMappingURL=useCachedQuery.js.map