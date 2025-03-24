/**
 * @fileoverview In-memory storage adapter implementation with LRU caching
 */
import { IStorageAdapter } from '../interfaces/i-storage-adapter';
import { HealthStatus } from '../types/index';
/**
 * Configuration options for the memory storage adapter
 */
export interface MemoryStorageOptions {
    maxSize?: number;
    maxItems?: number;
    defaultTtl?: number;
    updateAgeOnGet?: boolean;
    allowStale?: boolean;
}
/**
 * Cache entry metadata
 */
interface CacheEntryMetadata {
    tags: string[];
    createdAt: number;
    expiresAt?: number;
    size: number;
    compressed?: boolean;
    lastAccessed: number;
    accessCount: number;
}
/**
 * In-memory storage adapter using LRU cache
 */
export declare class MemoryStorageAdapter implements IStorageAdapter {
    private storage;
    private metadata;
    private config;
    readonly name: string;
    constructor(config?: any);
    private emit;
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, options?: {
        ttl?: number;
    }): Promise<void>;
    private calculateSize;
    getMetadata(key: string): Promise<CacheEntryMetadata | null>;
    setMetadata(key: string, metadata: Partial<CacheEntryMetadata>): Promise<void>;
    getMany<T>(keys: string[]): Promise<Record<string, T | null>>;
    setMany<T>(entries: Record<string, T>, options?: {
        ttl?: number;
    }): Promise<void>;
    delete(key: string): Promise<boolean>;
    clear(): Promise<void>;
    has(key: string): Promise<boolean>;
    keys(pattern?: string): Promise<string[]>;
    getStats(): Promise<Record<string, any>>;
    healthCheck(): Promise<HealthStatus>;
}
export declare const MemoryAdapter: typeof MemoryStorageAdapter;
export {};
