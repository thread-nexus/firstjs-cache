/**
 * @fileoverview Interface for storage adapters
 */

import {CacheOptions, EntryMetadata, HealthStatus} from '../types';

/**
 * Interface for storage adapters
 */
export interface IStorageAdapter {
    /**
     * Get a value from storage
     *
     * @param key - Storage key
     * @returns Stored value or null if not found
     */
    get<T = any>(key: string): Promise<T | null>;

    /**
     * Set a value in storage
     *
     * @param key - Storage key
     * @param value - Value to store
     * @param options - Storage options
     */
    set<T = any>(key: string, value: T, options?: CacheOptions): Promise<void>;

    /**
     * Delete a value from storage
     *
     * @param key - Storage key
     * @returns True if value was deleted, false if not found
     */
    delete(key: string): Promise<boolean>;

    /**
     * Clear all values from storage
     */
    clear(): Promise<void>;

    /**
     * Check if a key exists in storage
     *
     * @param key - Storage key
     * @returns True if key exists
     */
    has(key: string): Promise<boolean>;

    /**
     * Get multiple values from storage
     *
     * @param keys - Storage keys
     * @returns Object mapping keys to values
     */
    getMany<T = any>(keys: string[]): Promise<Record<string, T | null>>;

    /**
     * Set multiple values in storage
     *
     * @param entries - Object mapping keys to values
     * @param options - Storage options
     */
    setMany<T = any>(entries: Record<string, T>, options?: CacheOptions): Promise<void>;

    /**
     * Get keys matching a pattern
     *
     * @returns Array of matching keys
     */
    keys(): Promise<string[]>;

    /**
     * Get storage statistics
     *
     * @returns Storage statistics
     */
    getStats(): Promise<Record<string, any>>;

    /**
     * Perform a health check on the storage
     *
     * @returns Health status
     */
    healthCheck(): Promise<HealthStatus>;

    /**
     * Get metadata for a key
     *
     * @param key - Storage key
     * @returns Metadata for the key
     */
    getMetadata?(key: string): Promise<EntryMetadata | undefined>;

    /**
     * Set metadata for a key
     *
     * @param key - Storage key
     * @param metadata - Metadata to set
     */
    setMetadata?(key: string, metadata: Partial<EntryMetadata>): Promise<void>;
}

/**
 * Base storage adapter configuration
 */
export interface StorageAdapterConfig {
    /**
     * Adapter name
     */
    name?: string;

    /**
     * Key prefix
     */
    prefix?: string;

    /**
     * Default TTL in seconds
     */
    defaultTtl?: number;

    /**
     * Whether to serialize values before storing
     */
    serialize?: boolean;

    /**
     * Whether to compress values before storing
     */
    compression?: boolean;

    /**
     * Size threshold for compression in bytes
     */
    compressionThreshold?: number;
}

export interface StorageOptions {
    ttl?: number;
    tags?: string[];
    compression?: boolean;
    compressionThreshold?: number;
}