import { useState, useEffect, useRef, useCallback } from 'react';
import { CacheManagerCore } from '../implementations/cache-manager-core';
import { CacheOptions } from '../types/common';

// Default cache manager instance
const defaultCacheManager = new CacheManagerCore();

// Cache query options
export interface UseCacheQueryOptions<T = any> {
  // Cache key
  key: string;
  
  // Function to fetch data
  fetcher: () => Promise<T>;
  
  // Cache options
  options?: CacheOptions;
  
  // Whether to auto-fetch data
  autoFetch?: boolean;
  
  // Stale time in milliseconds
  staleTime?: number;
  
  // Retry count
  retryCount?: number;
  
  // Retry delay in milliseconds
  retryDelay?: number;
  
  // Callback on success
  onSuccess?: (data: T) => void;
  
  // Callback on error
  onError?: (error: Error) => void;
  
  // Custom cache manager
  cacheManager?: CacheManagerCore;
}

// Cache query result
export interface UseCacheQueryResult<T> {
  // Cached data
  data: T | null;
  
  // Error if any
  error: Error | null;
  
  // Whether data is loading
  isLoading: boolean;
  
  // Whether data is fetching (initial or refetch)
  isFetching: boolean;
  
  // Manually trigger a refetch
  refetch: () => Promise<T | null>;
  
  // Manually update data
  setData: (newData: T) => Promise<void>;
  
  // Manually invalidate cache
  invalidate: () => Promise<void>;
}

/**
 * Hook to query cache with automatic fetching
 */
export function useCacheQuery<T = any>({
  key,
  fetcher,
  options,
  autoFetch = true,
  staleTime = 0,
  retryCount = 0,
  retryDelay = 1000,
  onSuccess,
  onError,
  cacheManager = defaultCacheManager,
}: UseCacheQueryOptions<T>): UseCacheQueryResult<T> {
  // State
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  
  // Refs
  const cache = useRef(cacheManager);
  const fetchTime = useRef<number | null>(null);
  const retryAttempt = useRef(0);
  const isMounted = useRef(true);
  
  // Update cache ref when cacheManager changes
  useEffect(() => {
    cache.current = cacheManager;
  }, [cacheManager]);
  
  // Set mounted state
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Fetch data function
  const fetchData = useCallback(async (): Promise<T | null> => {
    if (!isMounted.current) return null;
    
    setIsFetching(true);
    retryAttempt.current = 0;
    
    try {
      // Try to get from cache
      const result = await cache.current.getOrCompute(key, fetcher, options as any);
      
      if (isMounted.current) {
        setData(result);
        setError(null);
        setIsLoading(false);
        fetchTime.current = Date.now();
        onSuccess?.(result);
      }
      
      return result;
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error(String(err));
      
      // Handle retry
      if (retryAttempt.current < retryCount) {
        retryAttempt.current++;
        
        // Retry after delay
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchData();
      }
      
      if (isMounted.current) {
        setError(fetchError);
        setIsLoading(false);
        onError?.(fetchError);
      }
      
      return null;
    } finally {
      if (isMounted.current) {
        setIsFetching(false);
      }
    }
  }, [key, fetcher, options, retryCount, retryDelay, onSuccess, onError]);
  
  // Manual refetch function
  const refetch = useCallback(async (): Promise<T | null> => {
    // Invalidate cache first
    await invalidate();
    
    // Then fetch fresh data
    return fetchData();
  }, [fetchData]);
  
  // Manual update function
  const updateData = useCallback(async (newData: T): Promise<void> => {
    if (!isMounted.current) return;
    
    try {
      // Update cache
      await cache.current.set(key, newData, options as any);
      
      // Update state
      setData(newData);
      setError(null);
      fetchTime.current = Date.now();
      onSuccess?.(newData);
    } catch (err) {
      const updateError = err instanceof Error ? err : new Error(String(err));
      setError(updateError);
      onError?.(updateError);
    }
  }, [key, options, onSuccess, onError]);
  
  // Manual invalidate function
  const invalidate = useCallback(async (): Promise<void> => {
    try {
      await cache.current.delete(key);
      fetchTime.current = null;
    } catch (err) {
      console.error(`Error invalidating cache for key ${key}:`, err);
    }
  }, [key]);
  
  // Check if data is stale
  const isStale = useCallback((): boolean => {
    if (!fetchTime.current || staleTime <= 0) return false;
    return Date.now() - fetchTime.current > staleTime;
  }, [staleTime]);
  
  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    } else {
      setIsLoading(false);
    }
  }, [autoFetch, fetchData]);
  
  // Refetch when stale
  useEffect(() => {
    if (!staleTime || staleTime <= 0) return;
    
    const checkStale = () => {
      if (isStale() && !isFetching) {
        fetchData();
      }
    };
    
    const interval = setInterval(checkStale, Math.min(staleTime, 60000));
    
    return () => {
      clearInterval(interval);
    };
  }, [staleTime, isStale, isFetching, fetchData]);
  
  return {
    data,
    error,
    isLoading,
    isFetching,
    refetch,
    setData: updateData,
    invalidate,
  };
}

export default useCacheQuery;