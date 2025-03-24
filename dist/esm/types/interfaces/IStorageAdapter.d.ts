/**
 * @fileoverview Storage adapter interface
 */
import { CacheOptions, EntryMetadata, CacheStats } from '../types/common';
/**
 * Interface for storage adapters
 */
export interface IStorageAdapter {
    /**
     * Get a value by key
     */
    get(key: string): Promise<any | null>;
    /**
     * Set a value with key
     */
    set(key: string, value: any, options?: CacheOptions): Promise<void>;
    /**
     * Delete a value by key
     */
    delete(key: string): Promise<boolean>;
    /**
     * Check if key exists
     */
    has(key: string): Promise<boolean>;
    /**
     * Clear all values
     */
    clear(): Promise<void>;
    /**
     * Get entry metadata
     */
    getMetadata(key: string): Promise<EntryMetadata | null>;
    /**
     * Get cache statistics
     */
    getStats(): Promise<CacheStats>;
    /**
     * Get all keys matching a pattern
     */
    keys(pattern?: string): Promise<string[]>;
    /**
     * Get multiple values by keys
     */
    getMany(keys: string[]): Promise<Record<string, any>>;
    /**
     * Set multiple key-value pairs
     */
    setMany(entries: Record<string, any>, options?: CacheOptions): Promise<void>;
    /**
     * Delete multiple keys
     */
    deleteMany(keys: string[]): Promise<number>;
    /**
     * Delete keys by pattern
     */
    deleteByPattern(pattern: string): Promise<number>;
    /**
     * Flush all data to disk (for persistent adapters)
     */
    flush?(): Promise<void>;
    /**
     * Close connection (for remote adapters)
     */
    close?(): Promise<void>;
}
