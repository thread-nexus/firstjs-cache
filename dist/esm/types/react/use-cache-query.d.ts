/**
 * @fileoverview React hooks for cache integration
 */
import { CacheOptions } from '../types/common';
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
export declare function useCacheQuery<T>(key: string, fetcher: () => Promise<T>, options?: UseCacheQueryOptions<T>): QueryResult<T>;
export {};
