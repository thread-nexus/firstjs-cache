/**
 * Cache metadata implementation
 */

import {EntryMetadata} from '../types';
import {TIME_CONSTANTS} from '../constants';

/**
 * Options for metadata operations
 */
interface CacheMetadataOptions {
    /**
     * Tags to associate with the cache entry
     */
    tags?: string[];

    /**
     * Time to live in seconds
     */
    ttl?: number;

    /**
     * Additional custom metadata
     */
    [key: string]: any;
}

/**
 * Cache metadata implementation
 */
export class CacheMetadata {
    private metadata = new Map<string, EntryMetadata>();
    private tagToKeys = new Map<string, Set<string>>();
    private accessHistory = new Map<string, Date[]>();
    private readonly maxHistoryLength: number;

    /**
     * Create a new cache metadata instance
     */
    constructor(options: { maxHistoryLength?: number } = {}) {
        this.maxHistoryLength = options.maxHistoryLength || 10;
    }
    /**
     * Get metadata for a cache key
     * 
     * @param key - The cache key
     * @returns Metadata for the key or undefined if not found
     */
    get(key: string): EntryMetadata | undefined {
        return this.metadata.get(key);
    }
    /**
     * Set metadata for a cache key
     * 
     * @param key - The cache key
     * @param data - Metadata to store
     */
    set(key: string, data: Partial<EntryMetadata>): void {
            const now = new Date();
        const existing = this.metadata.get(key);

        // Handle tags
        if (data.tags) {
            // Remove key from old tags
            if (existing?.tags) {
                for (const tag of existing.tags) {
                    const keys = this.tagToKeys.get(tag);
                    if (keys) {
                        keys.delete(key);
                        if (keys.size === 0) {
                            this.tagToKeys.delete(tag);
                        }
                    }
                }
            }

            // Add key to new tags
            for (const tag of data.tags) {
                let keys = this.tagToKeys.get(tag);
                if (!keys) {
                    keys = new Set<string>();
                    this.tagToKeys.set(tag, keys);
                }
                keys.add(key);
            }
        }

        // Create or update metadata
        const metadata: EntryMetadata = {
            createdAt: existing?.createdAt || now.getTime(),
            updatedAt: now.getTime(),
            accessCount: existing?.accessCount || 0,
            tags: data.tags || existing?.tags || [],
            lastAccessed: existing?.lastAccessed || now.getTime(), // ensure a number is assigned
            ...data
        };

        this.metadata.set(key, metadata);
    }

    /**
     * Delete metadata for a cache key
     * 
     * @param key - The cache key
     * @returns True if metadata was deleted, false otherwise
     */
    delete(key: string): boolean {
        const metadata = this.metadata.get(key);
        if (!metadata) {
            return false;
}

        // Remove key from tags
        if (metadata.tags) {
            for (const tag of metadata.tags) {
                const keys = this.tagToKeys.get(tag);
                if (keys) {
                    keys.delete(key);
                    if (keys.size === 0) {
                        this.tagToKeys.delete(tag);
                    }
                }
            }
        }

        // Remove access history
        this.accessHistory.delete(key);

        // Remove metadata
        return this.metadata.delete(key);
    }

    /**
     * Clear all metadata
     */
    clear(): void {
        this.metadata.clear();
        this.tagToKeys.clear();
        this.accessHistory.clear();
    }

    /**
     * Find keys by tag
     * 
     * @param tag - Tag to search for
     * @returns Array of keys with the specified tag
     */
    findByTag(tag: string): string[] {
        const keys = this.tagToKeys.get(tag);
        return keys ? Array.from(keys) : [];
    }

    /**
     * Record access to a cache key
     * 
     * @param key - Cache key
     */
    recordAccess(key: string): void {
        const metadata = this.metadata.get(key);
        if (metadata) {
            metadata.accessCount++;
            metadata.lastAccessed = Date.now(); // ensure a number is assigned

            // Update access history
            let history = this.accessHistory.get(key);
            if (!history) {
                history = [];
                this.accessHistory.set(key, history);
            }

            history.push(new Date());
            if (history.length > this.maxHistoryLength) {
                history.shift();
            }
        }
    }

    /**
     * Check if a metadata entry is expired
     * 
     * @param key - Cache key
     * @returns True if expired, false otherwise
     */
    isExpired(key: string): boolean {
        const metadata = this.metadata.get(key);
        if (!metadata || !metadata.ttl) {
            return false;
        }

        const expirationTime = metadata.createdAt + metadata.ttl * TIME_CONSTANTS.ONE_SECOND;
        return Date.now() > expirationTime;
    }

    /**
     * Get all cache keys with metadata
     * 
     * @returns Array of all keys
     */
    keys(): string[] {
        return Array.from(this.metadata.keys());
    }

    /**
     * Get access history for a key
     * 
     * @param key - Cache key
     * @returns Array of access dates or empty array if not found
     */
    getAccessHistory(key: string): Date[] {
        return this.accessHistory.get(key) || [];
    }

    /**
     * Get expired keys
     * 
     * @returns Array of expired keys
     */
    getExpiredKeys(): string[] {
        const expired: string[] = [];
        for (const [key, metadata] of this.metadata.entries()) {
            if (metadata.ttl) {
                const expirationTime = metadata.createdAt + metadata.ttl * TIME_CONSTANTS.ONE_SECOND;
                if (Date.now() > expirationTime) {
                    expired.push(key);
                }
            }
        }
        return expired;
    }
}