import { EntryMetadata } from '../types/common';
export declare class CacheMetadataManager {
    private metadata;
    set(key: string, data: Partial<EntryMetadata>): void;
    get(key: string): EntryMetadata | undefined;
    /**
     * Clear all metadata
     */
    clear(): void;
    /**
     * Delete metadata for a cache key
     *
     * @param key - The cache key
     * @returns True if metadata was deleted, false otherwise
     */
    delete(key: string): boolean;
    /**
     * Find keys by tag
     *
     * @param tag - Tag to search for
     * @returns Array of keys with the specified tag
     */
    findByTag(tag: string): string[];
    /**
     * Find keys by prefix
     *
     * @param prefix - Prefix to search for
     * @returns Array of keys with the specified prefix
     */
    findByPrefix(prefix: string): string[];
    /**
     * Find keys by pattern
     *
     * @param pattern - Pattern to match against keys
     * @returns Array of keys matching the pattern
     */
    findByPattern(pattern: string): string[];
    /**
     * Update access count for a key
     *
     * @param key - The cache key
     */
    recordAccess(key: string): void;
    /**
     * Get all keys
     *
     * @returns Array of all keys
     */
    keys(): string[];
    /**
     * Get the number of entries
     *
     * @returns Number of entries
     */
    size(): number;
}
