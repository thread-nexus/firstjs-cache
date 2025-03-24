/**
 * @fileoverview React context provider for cache management with
 * configuration and dependency injection.
 */
import React, { createContext, useContext, useMemo } from 'react';
import { CacheManagerCore } from '../implementations';
import { DEFAULT_CONFIG } from '../config/default-config';
const CacheContext = createContext(null);
/**
 * Cache context provider component
 */
export function CacheProvider({ children, config, providers = [] }) {
    // Initialize cacheManager in useMemo to ensure stable reference
    const cacheManager = useMemo(() => {
        return new CacheManagerCore(config || DEFAULT_CONFIG);
    }, [config]);
    const contextValue = useMemo(() => ({
        cacheManager // This is now guaranteed to be defined
    }), [cacheManager]);
    return (React.createElement(CacheContext.Provider, { value: contextValue }, children));
}
/**
 * Hook to access cache manager
 */
export function useCacheManager() {
    const context = useContext(CacheContext);
    if (!context) {
        throw new Error('useCacheManager must be used within a CacheProvider');
    }
    return context.cacheManager;
}
/**
 * Hook to access cache value
 */
export function useCacheValue(key, initialValue) {
    const cacheManager = useCacheManager();
    const [value, setValue] = React.useState(initialValue || null);
    const [error, setError] = React.useState(null);
    const [isLoading, setIsLoading] = React.useState(true);
    // Load initial value
    React.useEffect(() => {
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
    const updateValue = React.useCallback(async (newValue) => {
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
export function useCacheBatch() {
    const cacheManager = useCacheManager();
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState(null);
    const executeBatch = React.useCallback(async (operations) => {
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
export function useCacheInvalidation() {
    const cacheManager = useCacheManager();
    return {
        invalidateKey: React.useCallback((key) => cacheManager.delete(key), [cacheManager]),
        invalidatePattern: React.useCallback((pattern) => {
            const keysToDelete = Array.from(pattern);
            return Promise.all(keysToDelete.map(key => cacheManager.delete(key)));
        }, [cacheManager]),
        clearAll: React.useCallback(() => cacheManager.clear(), [cacheManager])
    };
}
//# sourceMappingURL=cache-provider.js.map