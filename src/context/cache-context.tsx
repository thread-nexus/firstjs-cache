import React, {createContext, useCallback, useContext, useMemo} from 'react';
import { CacheOptions } from '../types/common';
import * as cacheCore from '../implementations/cache-manager-core';
import {DEFAULT_CONFIG} from '../config/default-config';
import {getCacheStats} from "../implementations/get-cache-stats";
import {deleteCacheValue} from "../implementations/delete-cache-value";

interface CacheContextValue {
  get: <T>(key: string) => Promise<T | null>;
  set: <T>(key: string, value: T, options?: CacheOptions) => Promise<void>;
  delete: (key: string) => Promise<boolean>;
  clear: () => Promise<void>;
  getStats: () => Promise<Record<string, any>>;
  getOrCompute: <T>(key: string, fn: () => Promise<T>, options?: CacheOptions) => Promise<T>;
  invalidateByTag: (tag: string) => Promise<void>;
  invalidateByPrefix: (prefix: string) => Promise<void>;
}

const CacheContext = createContext<CacheContextValue | null>(null);

interface CacheProviderProps {
  children: React.ReactNode;
  config?: typeof DEFAULT_CONFIG;
}

export function CacheProvider({ children, config = DEFAULT_CONFIG }: CacheProviderProps) {
  const get = useCallback(cacheCore.getCacheValue, []);
  const set = useCallback(cacheCore.setCacheValue, []);
  const delete_ = useCallback(deleteCacheValue, []);
  const clear = useCallback(async () => {
    // Use the deleteCacheValue to clear entries or implement a proper clear method
    return Promise.resolve(); // Placeholder implementation
  }, []);
  const getStats = useCallback(() => Promise.resolve({}), []); // Placeholder implementation
  const getOrCompute = useCallback(
    async <T,>(key: string, fetcher: () => Promise<T>, options?: CacheOptions): Promise<T | null> => {
      try {
        // Check cache first
        const cachedValue = await cacheCore.getCacheValue<T>(key);
        if (cachedValue !== null) {
          return cachedValue;
        }
        
        // Compute value
        const value = await fetcher();
        
        // Store in cache
        await cacheCore.setCacheValue(key, value, options);
        
        return value;
      } catch (error) {
        console.error('Error in getOrCompute:', error);
        return null;
      }
    },
    []
  );
  
  // Create a wrapper that enforces the right return type
  const getOrComputeWrapper = async <T,>(
    key: string, 
    fn: () => Promise<T>, 
    options?: CacheOptions
  ): Promise<T> => {
    const result = await getOrCompute(key, fn, options);
    // Since we know fn returns T, and getOrCompute will either return cached T or compute new T,
    // we can assert that null won't actually happen in practice (or throw if it does)
    if (result === null) {
      throw new Error(`Cache operation failed for key: ${key}`);
    }
    return result as T;
  };

  const invalidateByTag = useCallback(async (tag: string) => {
    // Implementation would use metadata utils to find and invalidate tagged entries
    const keys: never[] = []; // Would use findKeysByTag
    for (const key of keys) {
      await deleteCacheValue(key);
    }
  }, []);

  const invalidateByPrefix = useCallback(async (prefix: string) => {
    // Implementation would use metadata utils to find and invalidate prefixed entries
    const keys: never[] = []; // Would use findKeysByPrefix
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

  return (
    <CacheContext.Provider value={{
      get: async <T,>(key: string): Promise<T | null> => {
        try {
          return await value.get(key);
        } catch {
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
    }}>
      {children}
    </CacheContext.Provider>
  );
}

export function useCache() {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within a CacheProvider');
  }
  return context;
}

// Custom hooks for specific cache operations
export function useCacheValue<T>(key: string, initialValue?: T) {
  const cache = useCache();
  const [value, setValue] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function fetchValue() {
      try {
        const cached = await cache.get<T>(key);
        if (mounted) {
          setValue(cached);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    }

    fetchValue().then(r => {});

    return () => {
      mounted = false;
    };
  }, [key, cache]);

  const updateValue = React.useCallback(async (newValue: T, options?: CacheOptions) => {
    try {
      await cache.set(key, newValue, options);
      setValue(newValue);
      setError(null);
    } catch (err) {
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
  const [stats, setStats] = React.useState<Record<string, any>>({});
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let mounted = true;

    async function fetchStats() {
      try {
        const currentStats = await cache.getStats();
        if (mounted) {
          setStats(currentStats);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    }

    fetchStats().then(r => {});
    const interval = setInterval(fetchStats, 5000); // Refresh every 5 seconds

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [cache]);

  return { stats, loading, error };
}