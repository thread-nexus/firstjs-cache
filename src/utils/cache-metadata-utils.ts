import {EntryMetadata} from '../types';

type MetadataStore = Map<string, EntryMetadata>;

const metadataStore: MetadataStore = new Map();

/**
 * Clear all metadata entries
 */
export function clearMetadata(): void {
    metadataStore.clear();
}

/**
 * Delete metadata for a specific key
 */
export function deleteMetadata(key: string): boolean {
    return metadataStore.delete(key);
}

/**
 * Find cache keys by tag
 */
export function findKeysByTag(tag: string): string[] {
    const matchingKeys: string[] = [];

    metadataStore.forEach((data, key) => {
        if (data.tags?.includes(tag)) {
            matchingKeys.push(key);
        }
    });

    return matchingKeys;
}

/**
 * Find cache keys by prefix
 */
export function findKeysByPrefix(prefix: string): string[] {
    const matchingKeys: string[] = [];

    metadataStore.forEach((_, key) => {
        if (key.startsWith(prefix)) {
            matchingKeys.push(key);
        }
    });

    return matchingKeys;
}

/**
 * Find cache keys by pattern
 */
export function findKeysByPattern(pattern: string): string[] {
    try {
        const regex = new RegExp(pattern);
        const matchingKeys: string[] = [];

        metadataStore.forEach((_, key) => {
            if (regex.test(key)) {
                matchingKeys.push(key);
            }
        });

        return matchingKeys;
    } catch {
        // If pattern is not a valid regex, treat as literal prefix
        return findKeysByPrefix(pattern);
    }
}

/**
 * Get metadata for a cache key
 */
export function getMetadata(key: string): EntryMetadata | undefined {
    return metadataStore.get(key);
}

/**
 * Set metadata for a cache key
 */
export function setMetadata(key: string, data: Partial<EntryMetadata>): void {
    const existing = metadataStore.get(key);
    const now = Date.now();

    if (existing) {
        metadataStore.set(key, {
            ...existing,
            ...data,
            updatedAt: now
        });
    } else {
        metadataStore.set(key, {
            tags: [],
            createdAt: now,
            lastAccessed: now,
            size: 0,
            compressed: false,
            accessCount: 0,
            ...data,
            updatedAt: now
        });
    }
}

/**
 * Record an access to a cache key
 */
export function recordAccess(key: string): void {
    const metadata = metadataStore.get(key);

    if (metadata) {
        metadata.accessCount = (metadata.accessCount || 0) + 1;
        metadata.lastAccessed = Date.now();
        metadata.updatedAt = Date.now();
    }
}

/**
 * Get all cache keys
 */
export function getAllKeys(): string[] {
    return Array.from(metadataStore.keys());
}

/**
 * Get metadata store size
 */
export function getMetadataSize(): number {
    return metadataStore.size;
}

export function createMetadata(options?: Partial<EntryMetadata>): EntryMetadata {
    const now = Date.now();
    return {
        tags: options?.tags || [],
        createdAt: now,
        lastAccessed: now,
        size: options?.size || 0,
        compressed: options?.compressed || false,
        accessCount: 0,
        updatedAt: now
    };
}

export function updateMetadata(metadata: EntryMetadata): EntryMetadata {
    const now = Date.now();
    return {
        ...metadata,
        lastAccessed: now,
        accessCount: (metadata.accessCount || 0) + 1,
        updatedAt: now
    };
}