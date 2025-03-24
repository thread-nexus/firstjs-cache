import React from 'react';
import { CacheOptions } from '../types/common';
import { DEFAULT_CONFIG } from '../config/default-config';
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
interface CacheProviderProps {
    children: React.ReactNode;
    config?: typeof DEFAULT_CONFIG;
}
export declare function CacheProvider({ children, config }: CacheProviderProps): React.JSX.Element;
export declare function useCache(): CacheContextValue;
export declare function useCacheValue<T>(key: string, initialValue?: T): {
    value: T | null;
    loading: boolean;
    error: Error | null;
    setValue: (newValue: T, options?: CacheOptions) => Promise<void>;
};
export declare function useCacheInvalidation(): {
    invalidateByTag: (tag: string) => Promise<void>;
    invalidateByPrefix: (prefix: string) => Promise<void>;
    clearAll: () => Promise<void>;
};
export declare function useCacheStats(): {
    stats: Record<string, any>;
    loading: boolean;
    error: Error | null;
};
export {};
