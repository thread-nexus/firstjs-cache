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
exports.CacheProvider = CacheProvider;
exports.useCache = useCache;
exports.useCacheValue = useCacheValue;
exports.useCacheInvalidation = useCacheInvalidation;
exports.useCacheStats = useCacheStats;
const react_1 = __importStar(require("react"));
const cacheCore = __importStar(require("../implementations/cache-manager-core"));
const default_config_1 = require("../config/default-config");
const get_cache_stats_1 = require("../implementations/get-cache-stats");
const CacheContext = (0, react_1.createContext)(null);
function CacheProvider({ children, config = default_config_1.DEFAULT_CONFIG }) {
    const get = (0, react_1.useCallback)(cacheCore.getCacheValue, []);
    const set = (0, react_1.useCallback)(cacheCore.setCacheValue, []);
    const delete_ = (0, react_1.useCallback)(cacheCore.deleteCacheValue, []);
    const clear = (0, react_1.useCallback)(cacheCore.clearCache, []);
    const getStats = (0, react_1.useCallback)(get_cache_stats_1.getCacheStats, []);
    const getOrCompute = (0, react_1.useCallback)(cacheCore.getOrComputeValue, []);
    const invalidateByTag = (0, react_1.useCallback)((tag) => __awaiter(this, void 0, void 0, function* () {
        // Implementation would use metadata utils to find and invalidate tagged entries
        const keys = []; // Would use findKeysByTag
        for (const key of keys) {
            yield cacheCore.deleteCacheValue(key);
        }
    }), []);
    const invalidateByPrefix = (0, react_1.useCallback)((prefix) => __awaiter(this, void 0, void 0, function* () {
        // Implementation would use metadata utils to find and invalidate prefixed entries
        const keys = []; // Would use findKeysByPrefix
        for (const key of keys) {
            yield cacheCore.deleteCacheValue(key);
        }
    }), []);
    const value = (0, react_1.useMemo)(() => ({
        get,
        set,
        delete: delete_,
        clear,
        getStats,
        getOrCompute,
        invalidateByTag,
        invalidateByPrefix
    }), [get, set, delete_, clear, getStats, getOrCompute, invalidateByTag, invalidateByPrefix]);
    return (react_1.default.createElement(CacheContext.Provider, { value: value }, children));
}
function useCache() {
    const context = (0, react_1.useContext)(CacheContext);
    if (!context) {
        throw new Error('useCache must be used within a CacheProvider');
    }
    return context;
}
// Custom hooks for specific cache operations
function useCacheValue(key, initialValue) {
    const cache = useCache();
    const [value, setValue] = react_1.default.useState(null);
    const [loading, setLoading] = react_1.default.useState(true);
    const [error, setError] = react_1.default.useState(null);
    react_1.default.useEffect(() => {
        let mounted = true;
        function fetchValue() {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const cached = yield cache.get(key);
                    if (mounted) {
                        setValue(cached);
                        setLoading(false);
                    }
                }
                catch (err) {
                    if (mounted) {
                        setError(err);
                        setLoading(false);
                    }
                }
            });
        }
        fetchValue().then(r => { });
        return () => {
            mounted = false;
        };
    }, [key, cache]);
    const updateValue = react_1.default.useCallback((newValue, options) => __awaiter(this, void 0, void 0, function* () {
        try {
            yield cache.set(key, newValue, options);
            setValue(newValue);
            setError(null);
        }
        catch (err) {
            setError(err);
        }
    }), [key, cache]);
    return {
        value,
        loading,
        error,
        setValue: updateValue
    };
}
function useCacheInvalidation() {
    const cache = useCache();
    return {
        invalidateByTag: cache.invalidateByTag,
        invalidateByPrefix: cache.invalidateByPrefix,
        clearAll: cache.clear
    };
}
function useCacheStats() {
    const cache = useCache();
    const [stats, setStats] = react_1.default.useState({});
    const [loading, setLoading] = react_1.default.useState(true);
    const [error, setError] = react_1.default.useState(null);
    react_1.default.useEffect(() => {
        let mounted = true;
        function fetchStats() {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const currentStats = yield cache.getStats();
                    if (mounted) {
                        setStats(currentStats);
                        setLoading(false);
                    }
                }
                catch (err) {
                    if (mounted) {
                        setError(err);
                        setLoading(false);
                    }
                }
            });
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
