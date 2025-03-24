import React, { createContext, useCallback, useContext, useMemo } from 'react';
import * as cacheCore from '../implementations/cache-manager-core';
import { DEFAULT_CONFIG } from '../config/default-config';
import { deleteCacheValue } from "../implementations/delete-cache-value";
const CacheContext = createContext(null);
export function CacheProvider({ children, config = DEFAULT_CONFIG }) {
    const get = useCallback(cacheCore.getCacheValue, []);
    const set = useCallback(cacheCore.setCacheValue, []);
    const delete_ = useCallback(deleteCacheValue, []);
    const clear = useCallback(async () => {
        // Use the deleteCacheValue to clear entries or implement a proper clear method
        return Promise.resolve(); // Placeholder implementation
    }, []);
    const getStats = useCallback(() => Promise.resolve({}), []); // Placeholder implementation
    const getOrCompute = useCallback(async (key, fetcher, options) => {
        try {
            // Check cache first
            const cachedValue = await cacheCore.getCacheValue(key);
            if (cachedValue !== null) {
                return cachedValue;
            }
            // Compute value
            const value = await fetcher();
            // Store in cache
            await cacheCore.setCacheValue(key, value, options);
            return value;
        }
        catch (error) {
            console.error('Error in getOrCompute:', error);
            return null;
        }
    }, []);
    // Create a wrapper that enforces the right return type
    const getOrComputeWrapper = async (key, fn, options) => {
        const result = await getOrCompute(key, fn, options);
        // Since we know fn returns T, and getOrCompute will either return cached T or compute new T,
        // we can assert that null won't actually happen in practice (or throw if it does)
        if (result === null) {
            throw new Error(`Cache operation failed for key: ${key}`);
        }
        return result;
    };
    const invalidateByTag = useCallback(async (tag) => {
        // Implementation would use metadata utils to find and invalidate tagged entries
        const keys = []; // Would use findKeysByTag
        for (const key of keys) {
            await deleteCacheValue(key);
        }
    }, []);
    const invalidateByPrefix = useCallback(async (prefix) => {
        // Implementation would use metadata utils to find and invalidate prefixed entries
        const keys = []; // Would use findKeysByPrefix
        for (const key of keys) {
            await deleteCacheValue(key);
        }
    }, []);
    const value = useMemo(() => ({
        get,
        set,
        delete: delete_,
        clear,
        getStats,
        getOrCompute: getOrComputeWrapper,
        invalidateByTag,
        invalidateByPrefix
    }), [get, set, delete_, clear, getStats, getOrComputeWrapper, invalidateByTag, invalidateByPrefix]);
    return (React.createElement(CacheContext.Provider, { value: {
            get: async (key) => {
                try {
                    return await value.get(key);
                }
                catch {
                    return null;
                }
            },
            set,
            delete: delete_,
            clear,
            getStats,
            getOrCompute: getOrComputeWrapper,
            invalidateByTag,
            invalidateByPrefix
        } }, children));
}
export function useCache() {
    const context = useContext(CacheContext);
    if (!context) {
        throw new Error('useCache must be used within a CacheProvider');
    }
    return context;
}
// Custom hooks for specific cache operations
export function useCacheValue(key, initialValue) {
    const cache = useCache();
    const [value, setValue] = React.useState(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    React.useEffect(() => {
        let mounted = true;
        async function fetchValue() {
            try {
                const cached = await cache.get(key);
                if (mounted) {
                    setValue(cached);
                    setLoading(false);
                }
            }
            catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setLoading(false);
                }
            }
        }
        fetchValue().then(r => { });
        return () => {
            mounted = false;
        };
    }, [key, cache]);
    const updateValue = React.useCallback(async (newValue, options) => {
        try {
            await cache.set(key, newValue, options);
            setValue(newValue);
            setError(null);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        }
    }, [key, cache]);
    return {
        value,
        loading,
        error,
        setValue: updateValue
    };
}
export function useCacheInvalidation() {
    const cache = useCache();
    return {
        invalidateByTag: cache.invalidateByTag,
        invalidateByPrefix: cache.invalidateByPrefix,
        clearAll: cache.clear
    };
}
export function useCacheStats() {
    const cache = useCache();
    const [stats, setStats] = React.useState({});
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    React.useEffect(() => {
        let mounted = true;
        async function fetchStats() {
            try {
                const currentStats = await cache.getStats();
                if (mounted) {
                    setStats(currentStats);
                    setLoading(false);
                }
            }
            catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err : new Error(String(err)));
                    setLoading(false);
                }
            }
        }
        fetchStats().then(r => { });
        const interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds
        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, [cache]);
    return { stats, loading, error };
}
//# sourceMappingURL=cache-context.js.map