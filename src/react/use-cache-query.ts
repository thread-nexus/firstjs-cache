/**
 * @fileoverview React hooks for cache integration with automatic
 * background refresh and optimistic updates.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { CacheOptions } from '../types/cache-types';
import { CacheEventType, subscribeToCacheEvents } from '../events/cache-events';
import { CacheManagerCore } from '../implementations';

interface UseCacheQueryOptions<T> extends CacheOptions {
  /** Initial data to show while loading */
  initialData?: T;
  /** Whether to suspend while loading */
  suspend?: boolean;
  /** Whether to revalidate on focus */
  revalidateOnFocus?: boolean;
  /** Whether to revalidate on reconnect */
  revalidateOnReconnect?: boolean;
  /** Polling interval in milliseconds */
  pollingInterval?: number;
  /** Callback when data changes */
  onSuccess?: (data: T) => void;
  /** Callback when error occurs */
  onError?: (error: Error) => void;
}

interface QueryResult<T> {
  /** Query data */
  data: T | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Whether data is stale */
  isStale: boolean;
  /** Manually trigger refresh */
  refresh: () => Promise<void>;
  /** Mutate data optimistically */
  mutate: (data: T | ((prev: T | null) => T)) => Promise<void>;
}

/**
 * React hook for cache queries with advanced features
 */
export function useCacheQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseCacheQueryOptions<T> = {}
): QueryResult<T> {
  const cache = useRef<CacheManagerCore>();
  const [data, setData] = useState<T | null>(options.initialData || null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(!options.initialData);
  const [isStale, setIsStale] = useState(false);

  // Initialize cache manager
  useEffect(() => {
    if (!cache.current) {
      cache.current = new CacheManagerCore();
    }
  }, []);

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!cache.current) return;

    try {
      setIsLoading(true);
      const result = await cache.current.getOrCompute(key, fetcher, options);
      setData(result);
      setError(null);
      options.onSuccess?.(result);
    } catch (err) {
      setError(err as Error);
      options.onError?.(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, options]);

  // Subscribe to cache events
  useEffect(() => {
    const unsubscribe = subscribeToCacheEvents(CacheEventType.SET, (event) => {
      if (event.key === key) {
        setData(event.value);
        setIsStale(false);
      }
    });

    return () => unsubscribe();
  }, [key]);

  // Handle background refresh
  useEffect(() => {
    if (!options.backgroundRefresh) return;

    const unsubscribe = subscribeToCacheEvents(CacheEventType.REFRESH_START, (event) => {
      if (event.key === key) {
        setIsStale(true);
      }
    });

    return () => unsubscribe();
  }, [key, options.backgroundRefresh]);

  // Handle revalidation on focus
  useEffect(() => {
    if (!options.revalidateOnFocus) return;

    const onFocus = () => {
      fetchData().then(r => {});
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchData, options.revalidateOnFocus]);

  // Handle revalidation on reconnect
  useEffect(() => {
    if (!options.revalidateOnReconnect) return;

    const onOnline = () => {
      fetchData().then(r => {});
    };

    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [fetchData, options.revalidateOnReconnect]);

  // Handle polling
  useEffect(() => {
    if (!options.pollingInterval) return;

    const interval = setInterval(() => {
      fetchData().then(r => {});
    }, options.pollingInterval);

    return () => clearInterval(interval);
  }, [fetchData, options.pollingInterval]);

  // Initial fetch
  useEffect(() => {
    fetchData().then(r => {});
  }, [fetchData]);

  // Mutate function for optimistic updates
  const mutate = useCallback(async (updater: T | ((prev: T | null) => T)) => {
    if (!cache.current) return;

    const newData = typeof updater === 'function' ? updater(data) : updater;
    setData(newData);

    try {
      await cache.current.set(key, newData, options);
    } catch (err) {
      // Revert on error
      setData(data);
      throw err;
    }
  }, [key, data, options]);

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