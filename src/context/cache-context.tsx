import React, {createContext, ReactNode, useCallback, useContext} from 'react';
import {CacheManagerCore} from '../implementations';
import {CacheOptions} from '../types';

// Create a default instance of CacheManagerCore
const cacheCore = new CacheManagerCore();

// Context type
interface CacheContextType {
    get: <T = any>(key: string) => Promise<T | null>;
    set: <T = any>(key: string, value: T, options?: CacheOptions) => Promise<void>;
    delete: (key: string) => Promise<boolean>;
    clear: () => Promise<void>;
    getOrCompute: <T = any>(key: string, fetcher: () => Promise<T>, options?: CacheOptions) => Promise<T>;
}

// Create context with default values
const CacheContext = createContext<CacheContextType>({
    get: async () => null,
    set: async () => {
    },
    delete: async () => false,
    clear: async () => {
    },
    getOrCompute: async (_, fetcher) => fetcher(),
});

// Provider props
interface CacheProviderProps {
    children: ReactNode;
    cacheManager?: CacheManagerCore;
}

// Cache provider component
export const CacheProvider: React.FC<CacheProviderProps> = ({
                                                                children,
                                                                cacheManager = cacheCore
                                                            }) => {
    // Create memoized methods
    const get = useCallback(<T = any>(key: string): Promise<T | null> => {
        return cacheManager.getCacheValue<T>(key);
    }, [cacheManager]);

    const set = useCallback(<T = any>(key: string, value: T, options?: CacheOptions): Promise<void> => {
        return cacheManager.setCacheValue(key, value, options);
    }, [cacheManager]);

    const delete_ = useCallback((key: string): Promise<boolean> => {
        return cacheManager.delete(key);
    }, [cacheManager]);

    const clear = useCallback((): Promise<void> => {
        return cacheManager.clear();
    }, [cacheManager]);

    const getOrCompute = useCallback(async <T = any>(
        key: string,
        fetcher: () => Promise<T>,
        options?: CacheOptions
    ): Promise<T> => {
        try {
            // Try to get from cache first
            const cachedValue = await cacheManager.getCacheValue<T>(key);
            if (cachedValue !== null) {
                return cachedValue;
            }

            // Compute value
            const value = await fetcher();

            // Store in cache
            await cacheManager.setCacheValue(key, value, options);

            return value;
        } catch (error) {
            console.error(`Error in getOrCompute for key ${key}:`, error);
            throw error;
        }
    }, [cacheManager]);

    // Create context value
    const contextValue = {
        get,
        set,
        delete: delete_,
        clear,
        getOrCompute,
    };

    return (
        <CacheContext.Provider value={contextValue}>
            {children}
        </CacheContext.Provider>
    );
};

// Hook to use cache context
export const useCache = () => useContext(CacheContext);

// Export cache core for direct usage
export {cacheCore};