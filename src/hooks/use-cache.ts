import {useCallback, useEffect, useState} from 'react';
import {CacheOptions} from '../types/common';
import * as cacheCore from '../implementations/cache-manager-core';
import {CacheEventType, subscribeToCacheEvents} from '../events/cache-events';
import {deleteCacheValue} from "../implementations/delete-cache-value";

interface UseCacheOptions extends CacheOptions {
  suspense?: boolean;
  revalidate?: boolean;
  revalidateInterval?: number;
}

/**
 * React hook for cache operations
 */
export function useCache<T = any>(
  key: string,
  fetcher?: () => Promise<T>,
  options: UseCacheOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStale, setIsStale] = useState(false);

  const fetchData = useCallback(async () => {
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
      } else {
        value = await cacheCore.getCacheValue(key);
      }
      
      setData(value);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, options]);

  // Initial fetch
  useEffect(() => {
    fetchData().then(r => {});
  }, [fetchData]);

  // Set up revalidation if enabled
  useEffect(() => {
    if (!options.revalidate || !options.revalidateInterval) {
      return;
    }

    const interval = setInterval(fetchData, options.revalidateInterval);
    return () => clearInterval(interval);
  }, [fetchData, options.revalidate, options.revalidateInterval]);

  // Subscribe to cache events
  useEffect(() => {
    const unsubscribe = subscribeToCacheEvents('all', (payload) => {
      if (payload.key === key) {
        setIsStale(true);
      }
    });
    return unsubscribe;
  }, [key, fetchData]);

  // Cache operations
  const setValue = useCallback(async (value: T) => {
    await cacheCore.setCacheValue(key, value, options);
    setData(value);
  }, [key, options]);

  const invalidate = useCallback(async () => {
    await deleteCacheValue(key);
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
export function useCachedQuery<T = any, P extends any[] = any[]>(
  queryFn: (...args: P) => Promise<T>,
  options: UseCacheOptions = {}
) {
  return function useQuery(...args: P) {
    const key = JSON.stringify(args);
    const fetcher = () => queryFn(...args);
    return useCache<T>(key, fetcher, options);
  };
}

/**
 * Hook for managing multiple cache entries
 */
export function useCacheList<T = any>(
  keys: string[],
  options: UseCacheOptions = {}
) {
  const [data, setData] = useState<Record<string, T | null>>({});
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Implement batch fetching manually
      const results: Record<string, T | null> = {};
      for (const key of keys) {
        results[key] = await cacheCore.getCacheValue<T>(key);
      }
      setData(results);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [keys]);

  useEffect(() => {
    fetchAll().then(r => {});
  }, [fetchAll]);

  const setValues = useCallback(async (values: Record<string, T>) => {
    try {
      for (const [key, value] of Object.entries(values)) {
        await cacheCore.setCacheValue(key, value, options);
      }
      setData(prev => ({ ...prev, ...values }));
    } catch (error) {
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