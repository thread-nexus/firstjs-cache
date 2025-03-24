/**
 * @fileoverview Cache metadata management implementation
 */
/**
 * Cache item metadata
 */
interface CacheItemMetadata {
    key: string;
    tags: string[];
    createdAt: number;
    lastAccessed: number;
    accessCount: number;
    size?: number;
    ttl?: number;
    expiresAt?: number;
}
/**
* Cache metadata manager implementation
 */
export declare class CacheMetadataManager {
    private metadata;
    /**
     * Set metadata for a cache item
     *
     * @param key - Cache key
     * @param data - Metadata to set
     */
    set(key: string, data: {
        tags?: string[];
        size?: number;
        ttl?: number;
    }): void;
    /**
     * Get metadata for a cache item
     *
     * @param key - Cache key
     * @returns Metadata or null if not found
     */
    get(key: string): CacheItemMetadata | null;
    /**
     * Delete metadata for a cache item
     *
     * @param key - Cache key
     * @returns Whether metadata was deleted
     */
    delete(key: string): boolean;
    /**
     * Record access to a cache item
     *
     * @param key - Cache key
     */
    recordAccess(key: string): void;
    /**
     * Find keys by tag
     *
     * @param tag - Tag to search for
     * @returns Array of keys with the tag
     */
    findByTag(tag: string): string[];
    /**
     * Find expired keys
     *
     * @returns Array of expired keys
     */
    findExpired(): string[];
    /**
     * Clear all metadata
     */
    clear(): void;
    /**
     * Get all metadata
     *
     * @returns All metadata
     */
    getAll(): Record<string, CacheItemMetadata>;
}
export {};
