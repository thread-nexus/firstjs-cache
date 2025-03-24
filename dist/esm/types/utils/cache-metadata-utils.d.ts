import { EntryMetadata } from '../types/common';
/**
 * Clear all metadata entries
 */
export declare function clearMetadata(): void;
/**
 * Delete metadata for a specific key
 */
export declare function deleteMetadata(key: string): boolean;
/**
 * Find cache keys by tag
 */
export declare function findKeysByTag(tag: string): string[];
/**
 * Find cache keys by prefix
 */
export declare function findKeysByPrefix(prefix: string): string[];
/**
 * Find cache keys by pattern
 */
export declare function findKeysByPattern(pattern: string): string[];
/**
 * Get metadata for a cache key
 */
export declare function getMetadata(key: string): EntryMetadata | undefined;
/**
 * Set metadata for a cache key
 */
export declare function setMetadata(key: string, data: Partial<EntryMetadata>): void;
/**
 * Record an access to a cache key
 */
export declare function recordAccess(key: string): void;
/**
 * Get all cache keys
 */
export declare function getAllKeys(): string[];
/**
 * Get metadata store size
 */
export declare function getMetadataSize(): number;
export declare function createMetadata(options?: Partial<EntryMetadata>): EntryMetadata;
export declare function updateMetadata(metadata: EntryMetadata): EntryMetadata;
