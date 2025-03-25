/**
 * @fileoverview Cache metadata management implementation
 */

import {CacheEventType, emitCacheEvent} from '../events/cache-events';
import { eventManager } from '../events/event-manager';

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
export class CacheMetadataManager {
    private metadata: Map<string, CacheItemMetadata> = new Map();

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
    }): void {
        const existing = this.metadata.get(key);
        const now = Date.now();

        const metadata: CacheItemMetadata = {
            key,
            tags: data.tags || existing?.tags || [],
            createdAt: existing?.createdAt || now,
            lastAccessed: now,
            accessCount: existing?.accessCount || 0,
            size: data.size !== undefined ? data.size : existing?.size,
            ttl: data.ttl !== undefined ? data.ttl : existing?.ttl
        };

        // Calculate expiration if TTL is provided
        if (metadata.ttl !== undefined && metadata.ttl > 0) {
            metadata.expiresAt = now + metadata.ttl * 1000;
        } else {
            metadata.expiresAt = undefined;
        }

        this.metadata.set(key, metadata);

        eventManager.emit(CacheEventType.METADATA_UPDATE, {
            key,
            size: metadata.size,
            timestamp: Date.now()
        });
    }

    /**
     * Get metadata for a cache item
     *
     * @param key - Cache key
     * @returns Metadata or null if not found
     */
    get(key: string): CacheItemMetadata | null {
        const metadata = this.metadata.get(key);
        return metadata ? {...metadata} : null;
    }

    /**
     * Delete metadata for a cache item
     *
     * @param key - Cache key
     * @returns Whether metadata was deleted
     */
    delete(key: string): boolean {
        const deleted = this.metadata.delete(key);

        if (deleted) {
            eventManager.emit(CacheEventType.METADATA_DELETE, {
                key,
                timestamp: Date.now()
            });
        }

        return deleted;
    }

    /**
     * Record access to a cache item
     *
     * @param key - Cache key
     */
    recordAccess(key: string): void {
        const metadata = this.metadata.get(key);

        if (metadata) {
            metadata.lastAccessed = Date.now();
            metadata.accessCount++;
            this.metadata.set(key, metadata);
        }
    }

    /**
     * Find keys by tag
     *
     * @param tag - Tag to search for
     * @returns Array of keys with the tag
     */
    findByTag(tag: string): string[] {
        const keys: string[] = [];

        for (const [key, metadata] of this.metadata.entries()) {
            if (metadata.tags.includes(tag)) {
                keys.push(key);
            }
        }

        return keys;
    }

    /**
     * Find expired keys
     *
     * @returns Array of expired keys
     */
    findExpired(): string[] {
        const now = Date.now();
        const keys: string[] = [];

        for (const [key, metadata] of this.metadata.entries()) {
            if (metadata.expiresAt && metadata.expiresAt <= now) {
                keys.push(key);
            }
        }

        return keys;
    }

    /**
     * Clear all metadata
     */
    clear(): void {
        this.metadata.clear();
        eventManager.emit(CacheEventType.METADATA_CLEAR, {
            timestamp: Date.now()
        });
    }

    /**
     * Get all metadata
     *
     * @returns All metadata
     */
    getAll(): Record<string, CacheItemMetadata> {
        const result: Record<string, CacheItemMetadata> = {};

        for (const [key, metadata] of this.metadata.entries()) {
            result[key] = {...metadata};
        }

        return result;
    }
}
