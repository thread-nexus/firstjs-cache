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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const value = fetcher 
        ? await cacheCore.getOrComputeValue(key, fetcher, options)
        : cacheCore.getCacheValue(key);
      
      setData(value);
    } catch (err) {
      setError(err);
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
    return new subscribeToCacheEvents(CacheEventType.INVALIDATE,
        (payload: { key: string; }) => {
          if (payload.key === key) {
            fetchData().then(r => {
            });
          }
        });
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
      const values = await cacheCore.getMany(keys);
      setData(values);
    } catch (err) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [keys]);

  useEffect(() => {
    fetchAll().then(r => {});
  }, [fetchAll]);

  const setValues = useCallback(async (values: Record<string, T>) => {
    await cacheCore.setMany(values, options);
    setData(prev => ({ ...prev, ...values }));
  }, [options]);

  return {
    data,
    error,
    isLoading,
    setValues,
    refresh: fetchAll
  };
}