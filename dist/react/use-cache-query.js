"use strict";
/**
 * @fileoverview React hooks for cache integration with automatic
 * background refresh and optimistic updates.
 */
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
    const fetchData = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        if (!cache.current)
            return;
        try {
            setIsLoading(true);
            const result = yield cache.current.getOrCompute(key, fetcher, options);
            setData(result);
            setError(null);
            (_a = options.onSuccess) === null || _a === void 0 ? void 0 : _a.call(options, result);
        }
        catch (err) {
            setError(err);
            (_b = options.onError) === null || _b === void 0 ? void 0 : _b.call(options, err);
        }
        finally {
            setIsLoading(false);
        }
    }), [key, fetcher, options]);
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
        if (!options.backgroundRefresh)
            return;
        const unsubscribe = (0, cache_events_1.subscribeToCacheEvents)(cache_events_1.CacheEventType.REFRESH_START, (event) => {
            if (event.key === key) {
                setIsStale(true);
            }
        });
        return () => unsubscribe();
    }, [key, options.backgroundRefresh]);
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
    const mutate = (0, react_1.useCallback)((updater) => __awaiter(this, void 0, void 0, function* () {
        if (!cache.current)
            return;
        const newData = typeof updater === 'function' ? updater(data) : updater;
        setData(newData);
        try {
            yield cache.current.set(key, newData, options);
        }
        catch (err) {
            // Revert on error
            setData(data);
            throw err;
        }
    }), [key, data, options]);
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
