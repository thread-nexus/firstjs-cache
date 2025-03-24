/**
 * @fileoverview Cache metadata manager for tracking additional information about cache entries
 */
import { EntryMetadata } from '../types/common';
/**
 * Metadata for a cache entry - compatible with EntryMetadata
 */
export interface CacheEntryMetadata {
    /**
     * Tags associated with the cache entry
     */
    tags: string[];
    /**
     * When the entry was created - stored as Date but convertible to timestamp
     */
    createdAt: Date;
    /**
     * When the entry was last updated
     */
    updatedAt: Date;
    /**
     * Number of times the entry has been accessed
     */
    accessCount: number;
    /**
     * Last time the entry was accessed
     */
    lastAccessed?: Date;
    /**
     * Time to live in seconds
     */
    ttl?: number;
    /**
     * Access history
     */
    accessHistory?: Date[];
    /**
     * Size of the entry in bytes (required by EntryMetadata)
     */
    size: number;
    /**
     * Additional custom metadata
     */
    [key: string]: any;
}
/**
 * Options for setting metadata
 */
export interface CacheMetadataOptions {
    /**
     * Tags to associate with the cache entry
     */
    tags?: string[];
    /**
     * Time to live in seconds
     */
    ttl?: number;
    /**
     * Size of the entry in bytes
     */
    size?: number;
    /**
     * Additional custom metadata
     */
    [key: string]: any;
}
/**
 * Cache metadata manager
 */
export declare class CacheMetadata {
    private metadata;
    /**
     * Create a new metadata entry
     *
     * @param key - Cache key
     * @param tags - Tags to associate with the entry
     * @param options - Additional metadata options
     * @returns The created metadata entry
     */
    create(key: string, tags?: string[], options?: CacheMetadataOptions): CacheEntryMetadata;
    /**
     * Create multiple metadata entries at once
     *
     * @param entries - Map of keys to metadata options
     * @returns Map of keys to created metadata entries
     */
    bulkCreate(entries: Record<string, {
        tags: string[];
        options?: CacheMetadataOptions;
    }>): Record<string, CacheEntryMetadata>;
    /**
     * Set metadata for a cache key
     *
     * @param key - Cache key
     * @param options - Metadata options
     */
    set(key: string, options?: CacheMetadataOptions): void;
    /**
     * Update an existing metadata entry
     *
     * @param key - Cache key
     * @param updates - Properties to update
     * @returns The updated metadata entry or undefined if not found
     */
    update(key: string, updates: Partial<CacheEntryMetadata>): CacheEntryMetadata | undefined;
    /**
     * Get metadata for a cache key
     *
     * @param key - Cache key
     * @returns Metadata or undefined if not found
     * Convert CacheEntryMetadata to EntryMetadata for compatibility
     */
    get(key: string): EntryMetadata | undefined;
    /**
     * Delete metadata for a cache key
     *
     * @param key - Cache key
     * @returns True if metadata was deleted, false if not found
     */
    delete(key: string): boolean;
    /**
     * Clear all metadata
     */
    clear(): void;
    /**
     * Record an access to a cache key
     *
     * @param key - Cache key
     */
    recordAccess(key: string): void;
    /**
     * Get metadata entries by tag
     *
     * @param tag - Tag to search for
     * @returns Array of matching entries with their keys
     */
    getByTag(tag: string): Array<{
        key: string;
        metadata: CacheEntryMetadata;
    }>;
    /**
     * Find cache keys by tag
     *
     * @param tag - Tag to search for
     * @returns Array of matching keys
     */
    findByTag(tag: string): string[];
    /**
     * Find cache keys by prefix
     *
     * @param prefix - Key prefix to search for
     * @returns Array of matching keys
     */
    findByPrefix(prefix: string): string[];
    /**
     * Find cache keys by pattern
     *
     * @param pattern - Regular expression pattern to match keys
     * @returns Array of matching keys
     */
    findByPattern(pattern: string): string[];
    /**
     * Check if a metadata entry is expired
     *
     * @param key - Cache key
     * @returns True if expired, false otherwise
     */
    isExpired(key: string): boolean;
    /**
     * Get access history for a key
     *
     * @param key - Cache key
     * @returns Array of access timestamps or undefined if not found
     */
    getAccessHistory(key: string): Date[] | undefined;
    /**
     * Get all cache keys with metadata
     *
     * @returns Array of all keys
     */
    keys(): string[];
    /**
     * Get the number of metadata entries
     *
     * @returns Number of entries
     */
    size(): number;
    /**
     * Get summary statistics about metadata
     *
     * @returns Metadata statistics
     */
    getStats(): Record<string, any>;
}
