/**
 * @fileoverview Browser localStorage adapter with size management and expiration
 */

import {IStorageAdapter} from '../interfaces/i-storage-adapter';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';
import {handleCacheError} from '../utils/error-utils';
import {HealthStatus} from '../types';

interface StorageEntry {
    value: string;
    expiresAt?: number;
    size: number;
    createdAt: number;
}

export class LocalStorageAdapter implements IStorageAdapter {
    readonly name: string = 'localStorage';
    private readonly prefix: string;
    private readonly maxSize: number;
    private currentSize: number = 0;

    constructor(config: { prefix?: string; maxSize?: number } = {}) {
        this.prefix = config.prefix || 'cache';
        this.maxSize = config.maxSize || 5 * 1024 * 1024; // 5MB default
        this.initializeSize();
    }

    /**
     * Get value from localStorage
     */
    async get<T = any>(key: string): Promise<T | null> {
        try {
            const entry = this.getEntry(this.getKeyWithPrefix(key));

            if (!entry) {
                emitCacheEvent(CacheEventType.GET_MISS, {
                    key,
                    provider: 'localStorage'
                });
                return null;
            }

            // Check expiration
            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                await this.delete(key);
                return null;
            }

            emitCacheEvent(CacheEventType.GET_HIT, {
                key,
                provider: 'localStorage',
                age: Date.now() - entry.createdAt
            });

            // For non-string values, try to parse JSON
            if (typeof entry.value === 'string') {
                try {
                    return JSON.parse(entry.value) as T;
                } catch {
                    return entry.value as unknown as T;
                }
            }

            return entry.value as unknown as T;
        } catch (error) {
            handleCacheError(error, {
                operation: 'get',
                key,
                provider: 'localStorage'
            }, false);
            return null;
        }
    }

    /**
     * Set value in localStorage
     */
    async set<T = any>(key: string, value: T, options?: { ttl?: number }): Promise<void> {
        try {
            // Convert value to string if needed
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            const size = this.getSize(stringValue);

            // Ensure space is available
            if (size > this.maxSize) {
                throw new Error('Value exceeds maximum storage size');
            }

            // Make space if needed
            await this.ensureSpace(size);

            const entry: StorageEntry = {
                value: stringValue,
                size,
                createdAt: Date.now(),
                expiresAt: options?.ttl ? Date.now() + (options.ttl * 1000) : undefined
            };

            const prefixedKey = this.getKeyWithPrefix(key);
            const oldEntry = this.getEntry(prefixedKey);

            if (oldEntry) {
                this.currentSize -= oldEntry.size;
            }

            localStorage.setItem(prefixedKey, JSON.stringify(entry));
            this.currentSize += size;

            emitCacheEvent(CacheEventType.SET, {
                key,
                provider: 'localStorage',
                size
            });
        } catch (error) {
            handleCacheError(error, {
                operation: 'set',
                key,
                provider: 'localStorage'
            }, false);
            throw error;
        }
    }

    /**
     * Check if key exists in localStorage
     */
    async has(key: string): Promise<boolean> {
        try {
            const entry = this.getEntry(this.getKeyWithPrefix(key));

            if (!entry) {
                return false;
            }

            if (entry.expiresAt && Date.now() > entry.expiresAt) {
                await this.delete(key);
                return false;
            }

            return true;
        } catch (error) {
            handleCacheError(error, {
                operation: 'has',
                key,
                provider: 'localStorage'
            }, false);
            return false;
        }
    }

    /**
     * Delete value from localStorage
     */
    async delete(key: string): Promise<boolean> {
        try {
            const prefixedKey = this.getKeyWithPrefix(key);
            const entry = this.getEntry(prefixedKey);

            if (!entry) {
                return false;
            }

            localStorage.removeItem(prefixedKey);
            this.currentSize -= entry.size;

            emitCacheEvent(CacheEventType.DELETE, {
                key,
                provider: 'localStorage'
            });

            return true;
        } catch (error) {
            handleCacheError(error, {
                operation: 'delete',
                key,
                provider: 'localStorage'
            }, false);
            return false;
        }
    }

    /**
     * Clear all values with prefix
     */
    async clear(): Promise<void> {
        try {
            const keys = this.getAllKeys();

            keys.forEach(key => {
                localStorage.removeItem(key);
            });

            this.currentSize = 0;

            emitCacheEvent(CacheEventType.CLEAR, {
                provider: 'localStorage',
                clearedKeys: keys.length
            });
        } catch (error) {
            handleCacheError(error, {
                operation: 'clear',
                provider: 'localStorage'
            }, false);
            throw error;
        }
    }

    /**
     * Get matching keys
     */
    async keys(pattern?: string): Promise<string[]> {
        try {
            const keys = this.getAllKeys();

            if (!pattern) {
                return keys.map(key => this.removePrefix(key));
            }

            const regex = new RegExp(pattern.replace('*', '.*'));
            return keys
                .filter(key => regex.test(this.removePrefix(key)))
                .map(key => this.removePrefix(key));
        } catch (error) {
            handleCacheError(error, {
                operation: 'keys',
                provider: 'localStorage'
            }, false);
            throw error;
        }
    }

    /**
     * Get multiple values
     */
    async getMany<T = any>(keys: string[]): Promise<Record<string, T | null>> {
        const result: Record<string, T | null> = {};

        for (const key of keys) {
            result[key] = await this.get<T>(key);
        }

        return result;
    }

    /**
     * Set multiple values
     */
    async setMany<T = any>(entries: Record<string, T>, options?: { ttl?: number }): Promise<void> {
        for (const [key, value] of Object.entries(entries)) {
            await this.set(key, value, options);
        }
    }

    /**
     * Get storage statistics
     */
    async getStats(): Promise<Record<string, any>> {
        return {
            provider: 'localStorage',
            size: this.currentSize,
            maxSize: this.maxSize,
            itemCount: (await this.keys()).length
        };
    }

    /**
     * Health check
     */
    async healthCheck(): Promise<HealthStatus> {
        try {
            // Test if storage is accessible
            const testKey = `__health_check_${Date.now()}`;
            const testValue = { timestamp: Date.now() };
            await this.set(testKey, testValue);
            await this.get(testKey);
            await this.delete(testKey);
            
            const now = Date.now();
            
            return {
                status: 'healthy',
                healthy: true,
                timestamp: now,
                lastCheck: now
            };
        } catch (error) {
            const now = Date.now();
            
            return {
                status: 'unhealthy',
                healthy: false,
                timestamp: now,
                lastCheck: now,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Initialize size tracking
     */
    private initializeSize(): void {
        try {
            let totalSize = 0;
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key?.startsWith(this.prefix)) {
                    const entry = this.getEntry(key);
                    if (entry) {
                        totalSize += entry.size;
                    }
                }
            }
            this.currentSize = totalSize;
        } catch (error) {
            handleCacheError(error, {
                operation: 'initialize',
                provider: 'localStorage'
            }, false);
        }
    }

    private getKeyWithPrefix(key: string): string {
        return `${this.prefix}:${key}`;
    }

    private removePrefix(key: string): string {
        return key.slice(this.prefix.length + 1);
    }

    private getSize(value: string): number {
        return new Blob([value]).size;
    }

    private getEntry(key: string): StorageEntry | null {
        const data = localStorage.getItem(key);
        if (!data) return null;

        try {
            return JSON.parse(data);
        } catch {
            return null;
        }
    }

    private getAllKeys(): string[] {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(this.prefix)) {
                keys.push(key);
            }
        }
        return keys;
    }

    /**
     * Ensure enough space is available
     */
    private async ensureSpace(requiredSize: number): Promise<void> {
        if (this.currentSize + requiredSize <= this.maxSize) {
            return;
        }

        // Get all entries sorted by creation time
        const entries = this.getAllKeys()
            .map(key => ({
                key,
                entry: this.getEntry(key)!
            }))
            .filter(({entry}) => entry)
            .sort((a, b) => a.entry.createdAt - b.entry.createdAt);

        // Remove oldest entries until we have enough space
        for (const {key} of entries) {
            if (this.currentSize + requiredSize <= this.maxSize) {
                break;
            }
            await this.delete(this.removePrefix(key));
        }

        if (this.currentSize + requiredSize > this.maxSize) {
            throw new Error('Unable to free enough space');
        }
    }
}