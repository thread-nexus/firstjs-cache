/**
 * @fileoverview Browser localStorage adapter with size management and expiration
 */
import { IStorageAdapter } from '../interfaces/i-storage-adapter';
import { HealthStatus } from '../types/index';
export declare class LocalStorageAdapter implements IStorageAdapter {
    readonly name: string;
    private readonly prefix;
    private readonly maxSize;
    private currentSize;
    constructor(config?: {
        prefix?: string;
        maxSize?: number;
    });
    /**
     * Initialize size tracking
     */
    private initializeSize;
    /**
     * Get value from localStorage
     */
    get<T = any>(key: string): Promise<T | null>;
    /**
     * Set value in localStorage
     */
    set<T = any>(key: string, value: T, options?: {
        ttl?: number;
    }): Promise<void>;
    /**
     * Check if key exists in localStorage
     */
    has(key: string): Promise<boolean>;
    /**
     * Delete value from localStorage
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clear all values with prefix
     */
    clear(): Promise<void>;
    /**
     * Get matching keys
     */
    keys(pattern?: string): Promise<string[]>;
    /**
     * Get multiple values
     */
    getMany<T = any>(keys: string[]): Promise<Record<string, T | null>>;
    /**
     * Set multiple values
     */
    setMany<T = any>(entries: Record<string, T>, options?: {
        ttl?: number;
    }): Promise<void>;
    /**
     * Get storage statistics
     */
    getStats(): Promise<Record<string, any>>;
    /**
     * Health check
     */
    healthCheck(): Promise<HealthStatus>;
    private getKeyWithPrefix;
    private removePrefix;
    private getSize;
    private getEntry;
    private getAllKeys;
    /**
     * Ensure enough space is available
     */
    private ensureSpace;
}
