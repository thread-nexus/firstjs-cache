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
exports.useCacheManager = useCacheManager;
exports.useCacheValue = useCacheValue;
exports.useCacheBatch = useCacheBatch;
exports.useCacheInvalidation = useCacheInvalidation;
const react_1 = __importStar(require("react"));
const cache_manager_core_1 = require("../implementations/cache-manager-core");
const CacheContext = (0, react_1.createContext)(null);
/**
 * Cache context provider component
 */
function CacheProvider({ children, config, providers = [] }) {
    // Create cache manager instance
    const cacheManagerRef = (0, react_1.useRef)();
    if (!cacheManagerRef.current) {
        cacheManagerRef.current = new cache_manager_core_1.CacheManagerCore(config);
        // Register providers
        providers.forEach(({ name, instance, priority }) => {
            cacheManagerRef.current.registerProvider(name, instance, priority);
        });
    }
    const contextValue = (0, react_1.useMemo)(() => ({
        cacheManager: cacheManagerRef.current
    }), []);
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
        function loadValue() {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const cached = yield cacheManager.get(key);
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
            });
        }
        loadValue().then(r => { });
        return () => {
            mounted = false;
        };
    }, [key, cacheManager]);
    // Update value
    const updateValue = react_1.default.useCallback((newValue) => __awaiter(this, void 0, void 0, function* () {
        try {
            yield cacheManager.set(key, newValue);
            setValue(newValue);
            setError(null);
        }
        catch (err) {
            setError(err);
            throw err;
        }
    }), [key, cacheManager]);
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
    const executeBatch = react_1.default.useCallback((operations) => __awaiter(this, void 0, void 0, function* () {
        setIsLoading(true);
        setError(null);
        try {
            return yield cacheManager.batch(operations);
        }
        catch (err) {
            setError(err);
            throw err;
        }
        finally {
            setIsLoading(false);
        }
    }), [cacheManager]);
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
        invalidatePattern: react_1.default.useCallback((pattern) => cacheManager.batch(Array.from(pattern).map(key => ({
            type: 'delete',
            key
        }))), [cacheManager]),
        clearAll: react_1.default.useCallback(() => cacheManager.clear(), [cacheManager])
    };
}
