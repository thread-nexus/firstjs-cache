"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useCachedQuery = useCachedQuery;
/**
 * useCachedQuery.ts
 *
 * React hook for data fetching with cache support
 */
const react_1 = require("react");
const useCache_1 = require("./useCache");
/**
 * Hook for data fetching with cache support
 *
 * @param key - Cache key or array of values to create a key
 * @param fetchFn - Function to fetch data if not in cache
 * @param options - Query options including cache options
 * @returns Object containing data, loading state, error, and refetch function
 */
function useCachedQuery(key, fetchFn, options = {}) {
    const cache = (0, useCache_1.useCache)();
    const cacheKey = Array.isArray(key) ? key.join(':') : key;
    const [data, setData] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(true);
    const [error, setError] = (0, react_1.useState)(null);
    const fetchData = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        setIsLoading(true);
        setError(null);
        try {
            // Check cache first unless disabled
            if (!options.disableCache) {
                const cachedData = yield cache.get(cacheKey);
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
            const result = yield fetchFn();
            // Cache the result unless disabled
            if (!options.disableCache) {
                yield cache.set(cacheKey, result, {
                    ttl: options.ttl,
                    tags: options.tags
                });
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
    }), [cacheKey, fetchFn, cache, options]);
    (0, react_1.useEffect)(() => {
        if (options.skip) {
            setIsLoading(false);
            return;
        }
        fetchData().then(r => { });
    }, [fetchData, options.skip]);
    const refetch = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        yield fetchData();
    }), [fetchData]);
    return {
        data,
        isLoading,
        error,
        refetch
    };
}
