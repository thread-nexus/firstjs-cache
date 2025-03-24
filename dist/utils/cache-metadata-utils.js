"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearMetadata = clearMetadata;
exports.deleteMetadata = deleteMetadata;
exports.findKeysByTag = findKeysByTag;
exports.findKeysByPrefix = findKeysByPrefix;
exports.findKeysByPattern = findKeysByPattern;
exports.getMetadata = getMetadata;
exports.setMetadata = setMetadata;
exports.recordAccess = recordAccess;
exports.getAllKeys = getAllKeys;
exports.getMetadataSize = getMetadataSize;
exports.createMetadata = createMetadata;
exports.updateMetadata = updateMetadata;
const metadataStore = new Map();
/**
 * Clear all metadata entries
 */
function clearMetadata() {
    metadataStore.clear();
}
/**
 * Delete metadata for a specific key
 */
function deleteMetadata(key) {
    return metadataStore.delete(key);
}
/**
 * Find cache keys by tag
 */
function findKeysByTag(tag) {
    const matchingKeys = [];
    metadataStore.forEach((data, key) => {
        if (data.tags.includes(tag)) {
            matchingKeys.push(key);
        }
    });
    return matchingKeys;
}
/**
 * Find cache keys by prefix
 */
function findKeysByPrefix(prefix) {
    const matchingKeys = [];
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
function findKeysByPattern(pattern) {
    try {
        const regex = new RegExp(pattern);
        const matchingKeys = [];
        metadataStore.forEach((_, key) => {
            if (regex.test(key)) {
                matchingKeys.push(key);
            }
        });
        return matchingKeys;
    }
    catch {
        // If pattern is not a valid regex, treat as literal prefix
        return findKeysByPrefix(pattern);
    }
}
/**
 * Get metadata for a cache key
 */
function getMetadata(key) {
    return metadataStore.get(key);
}
/**
 * Set metadata for a cache key
 */
function setMetadata(key, data) {
    const existing = metadataStore.get(key);
    const now = Date.now();
    if (existing) {
        metadataStore.set(key, {
            ...existing,
            ...data,
            updatedAt: now
        });
    }
    else {
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
function recordAccess(key) {
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
function getAllKeys() {
    return Array.from(metadataStore.keys());
}
/**
 * Get metadata store size
 */
function getMetadataSize() {
    return metadataStore.size;
}
function createMetadata(options) {
    const now = Date.now();
    return {
        tags: options?.tags || [],
        createdAt: now,
        lastAccessed: now,
        size: options?.size || 0,
        compressed: options?.compressed || false,
        accessCount: 0
    };
}
function updateMetadata(metadata) {
    const now = Date.now();
    return {
        ...metadata,
        lastAccessed: now,
        accessCount: (metadata.accessCount || 0) + 1,
        updatedAt: now
    };
}
//# sourceMappingURL=cache-metadata-utils.js.map