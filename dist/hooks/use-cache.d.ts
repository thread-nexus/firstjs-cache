import { CacheOptions } from '../types/common';
interface UseCacheOptions extends CacheOptions {
    suspense?: boolean;
    revalidate?: boolean;
    revalidateInterval?: number;
}
/**
 * React hook for cache operations
 */
export declare function useCache<T = any>(key: string, fetcher?: () => Promise<T>, options?: UseCacheOptions): {
    data: T | null;
    error: Error | null;
    isLoading: boolean;
    setValue: (value: T) => Promise<void>;
    invalidate: () => Promise<void>;
    refresh: () => Promise<void>;
};
/**
 * Hook for cached query operations
 */
export declare function useCachedQuery<T = any, P extends any[] = any[]>(queryFn: (...args: P) => Promise<T>, options?: UseCacheOptions): (...args: P) => {
    data: T | null;
    error: Error | null;
    isLoading: boolean;
    setValue: (value: T) => Promise<void>;
    invalidate: () => Promise<void>;
    refresh: () => Promise<void>;
};
/**
 * Hook for managing multiple cache entries
 */
export declare function useCacheList<T = any>(keys: string[], options?: UseCacheOptions): {
    data: Record<string, T | null>;
    error: Error | null;
    isLoading: boolean;
    setValues: (values: Record<string, T>) => Promise<void>;
    refresh: () => Promise<void>;
};
export {};
