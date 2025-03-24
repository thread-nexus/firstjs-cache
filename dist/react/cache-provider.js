"use strict";
/**
 * @fileoverview React context provider for cache management with
 * configuration and dependency injection.
 */
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
exports.CacheProvider = CacheProvider;
exports.useCacheManager = useCacheManager;
exports.useCacheValue = useCacheValue;
exports.useCacheBatch = useCacheBatch;
exports.useCacheInvalidation = useCacheInvalidation;
const react_1 = __importStar(require("react"));
const implementations_1 = require("../implementations");
const default_config_1 = require("../config/default-config");
const CacheContext = (0, react_1.createContext)(null);
/**
 * Cache context provider component
 */
function CacheProvider({ children, config, providers = [] }) {
    // Initialize cacheManager in useMemo to ensure stable reference
    const cacheManager = (0, react_1.useMemo)(() => {
        return new implementations_1.CacheManagerCore(config || default_config_1.DEFAULT_CONFIG);
    }, [config]);
    const contextValue = (0, react_1.useMemo)(() => ({
        cacheManager // This is now guaranteed to be defined
    }), [cacheManager]);
    return (react_1.default.createElement(CacheContext.Provider, { value: contextValue }, children));
}
/**
 * Hook to access cache manager
 */
function useCacheManager() {
    const context = (0, react_1.useContext)(CacheContext);
    if (!context) {
        throw new Error('useCacheManager must be used within a CacheProvider');
    }
    return context.cacheManager;
}
/**
 * Hook to access cache value
 */
function useCacheValue(key, initialValue) {
    const cacheManager = useCacheManager();
    const [value, setValue] = react_1.default.useState(initialValue || null);
    const [error, setError] = react_1.default.useState(null);
    const [isLoading, setIsLoading] = react_1.default.useState(true);
    // Load initial value
    react_1.default.useEffect(() => {
        let mounted = true;
        async function loadValue() {
            try {
                const cached = await cacheManager.get(key);
                if (mounted) {
                    setValue(cached);
                    setError(null);
                }
            }
            catch (err) {
                if (mounted) {
                    setError(err);
                }
            }
            finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        }
        loadValue().then(r => { });
        return () => {
            mounted = false;
        };
    }, [key, cacheManager]);
    // Update value
    const updateValue = react_1.default.useCallback(async (newValue) => {
        try {
            await cacheManager.set(key, newValue);
            setValue(newValue);
            setError(null);
        }
        catch (err) {
            setError(err);
            throw err;
        }
    }, [key, cacheManager]);
    return {
        value,
        error,
        isLoading,
        setValue: updateValue
    };
}
/**
 * Hook for batch operations
 */
function useCacheBatch() {
    const cacheManager = useCacheManager();
    const [isLoading, setIsLoading] = react_1.default.useState(false);
    const [error, setError] = react_1.default.useState(null);
    const executeBatch = react_1.default.useCallback(async (operations) => {
        setIsLoading(true);
        setError(null);
        try {
            // Process batch manually if not supported
            const results = [];
            // Execute operations sequentially
            for (const op of operations) {
                // Handle operations manually
                if (op.type === 'get') {
                    await cacheManager.get(op.key);
                }
                else if (op.type === 'set') {
                    await cacheManager.set(op.key, op.value);
                }
                else if (op.type === 'delete') {
                    await cacheManager.delete(op.key);
                }
            }
            return results;
        }
        catch (err) {
            setError(err);
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    }, [cacheManager]);
    return {
        executeBatch,
        isLoading,
        error
    };
}
/**
 * Hook for cache invalidation
 */
function useCacheInvalidation() {
    const cacheManager = useCacheManager();
    return {
        invalidateKey: react_1.default.useCallback((key) => cacheManager.delete(key), [cacheManager]),
        invalidatePattern: react_1.default.useCallback((pattern) => {
            const keysToDelete = Array.from(pattern);
            return Promise.all(keysToDelete.map(key => cacheManager.delete(key)));
        }, [cacheManager]),
        clearAll: react_1.default.useCallback(() => cacheManager.clear(), [cacheManager])
    };
}
//# sourceMappingURL=cache-provider.js.map