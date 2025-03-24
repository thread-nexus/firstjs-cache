"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCache = useCache;
exports.useCachedQuery = useCachedQuery;
exports.useCacheList = useCacheList;
const react_1 = require("react");
const cacheCore = __importStar(require("../implementations/cache-manager-core"));
const cache_events_1 = require("../events/cache-events");
const delete_cache_value_1 = require("../implementations/delete-cache-value");
/**
 * React hook for cache operations
 */
function useCache(key, fetcher, options = {}) {
    const [data, setData] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const [isStale, setIsStale] = (0, react_1.useState)(false);
    const fetchData = (0, react_1.useCallback)(async () => {
        setIsLoading(true);
        setError(null);
        try {
            let value;
            if (fetcher) {
                // Implement our own getOrCompute logic
                value = await cacheCore.getCacheValue(key);
                if (value === null) {
                    value = await fetcher();
                    await cacheCore.setCacheValue(key, value, options);
                }
            }
            else {
                value = await cacheCore.getCacheValue(key);
            }
            setData(value);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        }
        finally {
            setIsLoading(false);
        }
    }, [key, fetcher, options]);
    // Initial fetch
    (0, react_1.useEffect)(() => {
        fetchData().then(r => { });
    }, [fetchData]);
    // Set up revalidation if enabled
    (0, react_1.useEffect)(() => {
        if (!options.revalidate || !options.revalidateInterval) {
            return;
        }
        const interval = setInterval(fetchData, options.revalidateInterval);
        return () => clearInterval(interval);
    }, [fetchData, options.revalidate, options.revalidateInterval]);
    // Subscribe to cache events
    (0, react_1.useEffect)(() => {
        const unsubscribe = (0, cache_events_1.subscribeToCacheEvents)('all', (payload) => {
            if (payload.key === key) {
                setIsStale(true);
            }
        });
        return unsubscribe;
    }, [key, fetchData]);
    // Cache operations
    const setValue = (0, react_1.useCallback)(async (value) => {
        await cacheCore.setCacheValue(key, value, options);
        setData(value);
    }, [key, options]);
    const invalidate = (0, react_1.useCallback)(async () => {
        await (0, delete_cache_value_1.deleteCacheValue)(key);
        await fetchData();
    }, [key, fetchData]);
    return {
        data,
        error,
        isLoading,
        setValue,
        invalidate,
        refresh: fetchData
    };
}
/**
 * Hook for cached query operations
 */
function useCachedQuery(queryFn, options = {}) {
    return function useQuery(...args) {
        const key = JSON.stringify(args);
        const fetcher = () => queryFn(...args);
        return useCache(key, fetcher, options);
    };
}
/**
 * Hook for managing multiple cache entries
 */
function useCacheList(keys, options = {}) {
    const [data, setData] = (0, react_1.useState)({});
    const [error, setError] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const fetchAll = (0, react_1.useCallback)(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Implement batch fetching manually
            const results = {};
            for (const key of keys) {
                results[key] = await cacheCore.getCacheValue(key);
            }
            setData(results);
        }
        catch (err) {
            setError(err instanceof Error ? err : new Error(String(err)));
        }
        finally {
            setIsLoading(false);
        }
    }, [keys]);
    (0, react_1.useEffect)(() => {
        fetchAll().then(r => { });
    }, [fetchAll]);
    const setValues = (0, react_1.useCallback)(async (values) => {
        try {
            for (const [key, value] of Object.entries(values)) {
                await cacheCore.setCacheValue(key, value, options);
            }
            setData(prev => ({ ...prev, ...values }));
        }
        catch (error) {
            console.error('Error setting cache values:', error);
        }
    }, [options]);
    return {
        data,
        error,
        isLoading,
        setValues,
        refresh: fetchAll
    };
}
//# sourceMappingURL=use-cache.js.map