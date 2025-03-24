/**
 * @fileoverview React context provider for cache management with
 * configuration and dependency injection.
 */
import React from 'react';
import { CacheManagerCore } from '../implementations';
import { DEFAULT_CONFIG } from '../config/default-config';
import { ICacheProvider } from '../interfaces/cache-provider';
interface CacheProviderProps {
    children: React.ReactNode;
    config?: typeof DEFAULT_CONFIG;
    providers?: Array<{
        name: string;
        instance: ICacheProvider;
        priority?: number;
    }>;
}
/**
 * Cache context provider component
 */
export declare function CacheProvider({ children, config, providers }: CacheProviderProps): React.JSX.Element;
/**
 * Hook to access cache manager
 */
export declare function useCacheManager(): CacheManagerCore;
/**
 * Hook to access cache value
 */
export declare function useCacheValue<T>(key: string, initialValue?: T): {
    value: T | null;
    error: Error | null;
    isLoading: boolean;
    setValue: (newValue: T) => Promise<void>;
};
/**
 * Hook for batch operations
 */
export declare function useCacheBatch(): {
    executeBatch: <T>(operations: Array<{
        type: "get" | "set" | "delete";
        key: string;
        value?: T;
    }>) => Promise<any[]>;
    isLoading: boolean;
    error: Error | null;
};
/**
 * Hook for cache invalidation
 */
export declare function useCacheInvalidation(): {
    invalidateKey: (key: string) => Promise<boolean>;
    invalidatePattern: (pattern: string) => Promise<boolean[]>;
    clearAll: () => Promise<void>;
};
export {};
