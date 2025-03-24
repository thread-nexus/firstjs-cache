import { CacheOptions } from '../types/common';
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
    /**
     * Whether to enable stale-while-revalidate caching strategy
     */
    staleWhileRevalidate?: boolean;
    /**
     * Time-to-live for cache entries in milliseconds
     */
    cacheTime?: number;
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
export declare function useCachedQuery<T>(key: string | any[], fetchFn: () => Promise<T>, options?: UseCachedQueryOptions): UseCachedQueryResult<T>;
export {};
