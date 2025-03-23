/**
 * useCachedQuery.ts
 * 
 * React hook for data fetching with cache support
 */
import { useState, useEffect, useCallback } from 'react';
import { useCache } from './useCache';
import { CacheOptions } from '../../interfaces/ICacheManager';

interface UseCachedQueryOptions extends CacheOptions {
  /**
   * Callback function called when data is successfully fetched
   */
  onSuccess?: (data: any) => void;
  
  /**
   * Callback function called when an error occurs during fetch
   */
  onError?: (error: Error) => void;
  
  /**
   * Whether to skip the initial fetch
   */
  skip?: boolean;
  
  /**
   * Whether to disable caching for this query
   */
  disableCache?: boolean;
}

interface UseCachedQueryResult<T> {
  /**
   * The fetched or cached data
   */
  data: T | null;
  
  /**
   * Whether the query is currently loading
   */
  isLoading: boolean;
  
  /**
   * Any error that occurred during the fetch
   */
  error: Error | null;
  
  /**
   * Function to manually refetch the data
   */
  refetch: () => Promise<void>;
}

/**
 * Hook for data fetching with cache support
 * 
 * @param key - Cache key or array of values to create a key
 * @param fetchFn - Function to fetch data if not in cache
 * @param options - Query options including cache options
 * @returns Object containing data, loading state, error, and refetch function
 */
export function useCachedQuery<T>(
  key: string | any[],
  fetchFn: () => Promise<T>,
  options: UseCachedQueryOptions = {}
): UseCachedQueryResult<T> {
  const cache = useCache();
  const cacheKey = Array.isArray(key) ? key.join(':') : key;
  
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Check cache first unless disabled
      if (!options.disableCache) {
        const cachedData = await cache.get(cacheKey);
        
        if (cachedData !== null) {
          setData(cachedData);
          setIsLoading(false);
          
          if (options.onSuccess) {
            options.onSuccess(cachedData);
          }
          
          return;
        }
      }
      
      // Fetch data
      const result = await fetchFn();
      
      // Cache the result unless disabled
      if (!options.disableCache) {
        await cache.set(cacheKey, result, {
          ttl: options.ttl,
          tags: options.tags
        });
      }
      
      setData(result);
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      
      if (options.onError) {
        options.onError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      setIsLoading(false);
    }
  }, [cacheKey, fetchFn, cache, options]);
  
  useEffect(() => {
    if (options.skip) {
      setIsLoading(false);
      return;
    }
    
    fetchData().then(r => {});
  }, [fetchData, options.skip]);
  
  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);
  
  return {
    data,
    isLoading,
    error,
    refetch
  };
}