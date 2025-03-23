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
exports.useCache = useCache;
exports.useCachedQuery = useCachedQuery;
exports.useCacheList = useCacheList;
const react_1 = require("react");
const cacheCore = __importStar(require("../implementations/cache-manager-core"));
const cache_events_1 = require("../events/cache-events");
/**
 * React hook for cache operations
 */
function useCache(key, fetcher, options = {}) {
    const [data, setData] = (0, react_1.useState)(null);
    const [error, setError] = (0, react_1.useState)(null);
    const [isLoading, setIsLoading] = (0, react_1.useState)(false);
    const fetchData = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        setIsLoading(true);
        setError(null);
        try {
            const value = fetcher
                ? yield cacheCore.getOrComputeValue(key, fetcher, options)
                : yield cacheCore.getCacheValue(key);
            setData(value);
        }
        catch (err) {
            setError(err);
        }
        finally {
            setIsLoading(false);
        }
    }), [key, fetcher, options]);
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
        return new cache_events_1.subscribeToCacheEvents(cache_events_1.CacheEventType.INVALIDATE, (payload) => {
            if (payload.key === key) {
                fetchData().then(r => {
                });
            }
        });
    }, [key, fetchData]);
    // Cache operations
    const setValue = (0, react_1.useCallback)((value) => __awaiter(this, void 0, void 0, function* () {
        yield cacheCore.setCacheValue(key, value, options);
        setData(value);
    }), [key, options]);
    const invalidate = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        yield cacheCore.deleteCacheValue(key);
        yield fetchData();
    }), [key, fetchData]);
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
    const fetchAll = (0, react_1.useCallback)(() => __awaiter(this, void 0, void 0, function* () {
        setIsLoading(true);
        setError(null);
        try {
            const values = yield cacheCore.getMany(keys);
            setData(values);
        }
        catch (err) {
            setError(err);
        }
        finally {
            setIsLoading(false);
        }
    }), [keys]);
    (0, react_1.useEffect)(() => {
        fetchAll().then(r => { });
    }, [fetchAll]);
    const setValues = (0, react_1.useCallback)((values) => __awaiter(this, void 0, void 0, function* () {
        yield cacheCore.setMany(values, options);
        setData(prev => (Object.assign(Object.assign({}, prev), values)));
    }), [options]);
    return {
        data,
        error,
        isLoading,
        setValues,
        refresh: fetchAll
    };
}
