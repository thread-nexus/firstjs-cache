import { HealthStatus } from '../types/index';
/**
 * Interface for low-level storage adapters
 */
export interface IStorageAdapter {
    /** Adapter name */
    readonly name: string;
    /**
     * Get raw data by key
     *
     * @param key The storage key
     * @returns The stored value or null if not found
     */
    get<T = any>(key: string): Promise<T | null>;
    /**
     * Set raw data with key
     *
     * @param key The storage key
     * @param value The value to store
     * @param options Optional storage options with TTL
     */
    set<T = any>(key: string, value: T, options?: {
        ttl?: number;
    }): Promise<void>;
    /**
     * Check if key exists
     *
     * @param key The storage key
     * @returns True if the key exists
     */
    has(key: string): Promise<boolean>;
    /**
     * Delete item by key
     *
     * @param key The storage key
     * @returns True if the item was deleted
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clear all data
     */
    clear(): Promise<void>;
    /**
     * Get keys matching pattern
     *
     * @param pattern Optional pattern to match keys against
     * @returns Array of matching keys
     */
    keys(pattern?: string): Promise<string[]>;
    /**
     * Get multiple items at once
     *
     * @param keys Array of keys to retrieve
     * @returns Record of key-value pairs
     */
    getMany<T = any>(keys: string[]): Promise<Record<string, T | null>>;
    /**
     * Set multiple items at once
     *
     * @param entries Record of key-value pairs to store
     * @param options Optional storage options with TTL
     */
    setMany<T = any>(entries: Record<string, T>, options?: {
        ttl?: number;
    }): Promise<void>;
    /**
     * Get adapter stats
     */
    getStats(): Promise<Record<string, any>>;
    /**
     * Perform health check
     */
    healthCheck(): Promise<HealthStatus>;
    /** Set metadata for a key */
    setMetadata?(key: string, metadata: any): Promise<void>;
    /** Get metadata for a key */
    getMetadata?(key: string): Promise<any>;
}
/**
 * Configuration for storage adapters
 */
export interface IStorageAdapterConfig {
    /** Optional key prefix */
    prefix?: string;
    /** Default TTL in seconds */
    defaultTtl?: number;
    /** Custom serializer */
    serializer?: {
        serialize: (data: any) => string;
        deserialize: (data: string) => any;
    };
    /** Maximum size in bytes (if applicable) */
    maxSize?: number;
    /** Whether to compress values (if supported) */
    compression?: boolean;
    /** Minimum size in bytes for compression */
    compressionThreshold?: number;
}
