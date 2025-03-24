/**
 * @fileoverview Enhanced cache manager implementation
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */
import { ICacheManager } from '../interfaces/i-cache-manager';
import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheStats, CacheOptions, EntryMetadata } from '../types/common';
interface CacheManagerConfig {
    providers: Record<string, any>;
    monitoring?: any;
    serialization?: any;
    rateLimit?: any;
    circuitBreaker?: any;
}
interface GetOptions extends CacheOptions {
    fallback?: () => Promise<any>;
    provider?: string;
}
interface SetOptions extends CacheOptions {
    ttl?: number;
    tags?: string[];
    provider?: string;
}
interface BatchOptions extends CacheOptions {
    maxBatchSize?: number;
    provider?: string;
}
interface BatchOperation {
    type: 'get' | 'set' | 'delete';
    key: string;
    value?: any;
    options?: any;
}
interface BatchResult {
    key: string;
    success: boolean;
    value?: any;
    error?: string;
}
export declare class CacheManager implements ICacheManager {
    private providers;
    private monitor;
    private serializer;
    private rateLimiter;
    private circuitBreaker;
    constructor(config: CacheManagerConfig);
    private initializeProviders;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    getStats(): Promise<Record<string, CacheStats>>;
    getOrCompute<T = any>(key: string, fn: () => Promise<T>, options?: CacheOptions): Promise<T>;
    wrap<T extends (...args: any[]) => Promise<any>>(fn: T, keyGenerator?: (...args: Parameters<T>) => string, options?: CacheOptions): T & {
        invalidateCache: (...args: Parameters<T>) => Promise<void>;
    };
    invalidateByTag(tag: string): Promise<void>;
    invalidateByPrefix(prefix: string): Promise<void>;
    getProvider(name: string): ICacheProvider | null;
    getMetadata(key: string): EntryMetadata | undefined;
    deleteByPattern(pattern: string): Promise<void>;
    keys(pattern?: string): Promise<string[]>;
    getMany(keys: string[]): Promise<Record<string, any>>;
    setMany(entries: Record<string, any>, options?: CacheOptions): Promise<void>;
    /**
     * Enhanced get operation with monitoring and error handling
     */
    get<T>(key: string, options?: GetOptions): Promise<T | null>;
    /**
     * Enhanced set operation with validation and compression
     */
    set<T>(key: string, value: T, options?: SetOptions): Promise<void>;
    /**
     * Enhanced batch operations
     */
    batch<T>(operations: BatchOperation[], options?: BatchOptions): Promise<BatchResult[]>;
    private executeBatch;
    private validateKey;
    private validateValue;
    private selectProvider;
    private handleError;
    private splitIntoBatches;
    private handleFallback;
    private executeWithMetrics;
}
export {};
