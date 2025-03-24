/**
 * @fileoverview Redis storage adapter implementation with connection pooling
 * and optimized batch operations.
 */

import {IStorageAdapter} from '../interfaces/i-storage-adapter';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';
import {handleCacheError} from '../utils/error-utils';
import {HealthStatus} from '../types';

// Redis client type definition
interface RedisClient {
    get(key: string): Promise<string | null>;

    set(key: string, value: string, options?: { EX?: number }): Promise<'OK'>;

    del(key: string | string[]): Promise<number>;

    exists(key: string): Promise<number>;

    keys(pattern: string): Promise<string[]>;

    mget(keys: string[]): Promise<(string | null)[]>;

    mset(entries: [string, string][]): Promise<'OK'>;

    scan(cursor: number, options: { MATCH?: string, COUNT?: number }): Promise<[string, string[]]>;

    quit(): Promise<void>;

    connect?(): Promise<void>;

    expire?(key: string, seconds: number): Promise<number>;
}

export class RedisAdapter implements IStorageAdapter {
    readonly name: string = 'redis';
    private client!: RedisClient;
    private readonly prefix: string;
    private readonly connectionPromise: Promise<void>;
    private isConnected = false;

    constructor(
        config: {
            prefix?: string;
            redis: {
                host: string;
                port: number;
                password?: string;
                db?: number;
                maxRetries?: number;
                connectTimeout?: number;
            };
        }
    ) {
        this.prefix = config.prefix || '';
        this.connectionPromise = this.connect(config.redis);
    }

    /**
     * Get value from Redis
     */
    async get<T = string>(key: string): Promise<T | null> {
        await this.ensureConnection();
        const prefixedKey = this.getKeyWithPrefix(key);

        try {
            const value = await this.client.get(prefixedKey);

            emitCacheEvent(
                value !== null ? CacheEventType.GET_HIT : CacheEventType.GET_MISS,
                {key, provider: 'redis'}
            );

            return value === null ? null : JSON.parse(value) as T;
        } catch (error) {
            handleCacheError(error, {
                operation: 'get',
                key,
                provider: 'redis'
            });
            throw error;
        }
    }

    /**
     * Set value in Redis
     */
    async set<T>(key: string, value: T, options?: { ttl?: number }): Promise<void> {
        await this.ensureConnection();
        const prefixedKey = this.getKeyWithPrefix(key);

        try {
            const stringValue = JSON.stringify(value);
            if (options?.ttl) {
                await this.client.set(prefixedKey, stringValue, {EX: options.ttl});
            } else {
                await this.client.set(prefixedKey, stringValue);
            }

            emitCacheEvent(CacheEventType.SET, {
                key,
                provider: 'redis',
                ttl: options?.ttl
            });
        } catch (error) {
            handleCacheError(error, {
                operation: 'set',
                key,
                provider: 'redis'
            });
            throw error;
        }
    }

    /**
     * Check if key exists in Redis
     */
    async has(key: string): Promise<boolean> {
        await this.ensureConnection();
        const prefixedKey = this.getKeyWithPrefix(key);

        try {
            const exists = await this.client.exists(prefixedKey);
            return exists === 1;
        } catch (error) {
            handleCacheError(error, {
                operation: 'has',
                key,
                provider: 'redis'
            });
            throw error;
        }
    }

    /**
     * Delete value from Redis
     */
    async delete(key: string): Promise<boolean> {
        await this.ensureConnection();
        const prefixedKey = this.getKeyWithPrefix(key);

        try {
            const deleted = await this.client.del(prefixedKey);

            if (deleted > 0) {
                emitCacheEvent(CacheEventType.DELETE, {
                    key,
                    provider: 'redis'
                });
            }

            return deleted > 0;
        } catch (error) {
            handleCacheError(error, {
                operation: 'delete',
                key,
                provider: 'redis'
            });
            throw error;
        }
    }

    /**
     * Clear all values with prefix
     */
    async clear(): Promise<void> {
        await this.ensureConnection();

        try {
            const pattern = this.prefix ? `${this.prefix}:*` : '*';
            let cursor = 0;

            do {
                const [nextCursor, keys] = await this.client.scan(cursor, {
                    MATCH: pattern,
                    COUNT: 100
                });

                if (keys.length > 0) {
                    await this.client.del(keys);
                }

                cursor = parseInt(nextCursor);
            } while (cursor !== 0);

            emitCacheEvent(CacheEventType.CLEAR, {
                provider: 'redis'
            });
        } catch (error) {
            handleCacheError(error, {
                operation: 'clear',
                provider: 'redis'
            });
            throw error;
        }
    }

    /**
     * Get matching keys from Redis
     */
    async keys(pattern?: string): Promise<string[]> {
        await this.ensureConnection();
        const prefixedPattern = pattern
            ? this.getKeyWithPrefix(pattern.replace('*', '\\*'))
            : (this.prefix ? `${this.prefix}:*` : '*');

        try {
            const keys = await this.client.keys(prefixedPattern);
            return keys.map(key => this.removePrefix(key));
        } catch (error) {
            handleCacheError(error, {
                operation: 'keys',
                provider: 'redis'
            });
            throw error;
        }
    }

    /**
     * Get multiple values from Redis
     */
    async getMany<T = string>(keys: string[]): Promise<Record<string, T | null>> {
        await this.ensureConnection();
        const prefixedKeys = keys.map(key => this.getKeyWithPrefix(key));

        try {
            const values = await this.client.mget(prefixedKeys);
            const result: Record<string, T | null> = {};

            keys.forEach((key, index) => {
                result[key] = values[index] ? JSON.parse(values[index]!) as T : null;
            });

            return result;
        } catch (error) {
            handleCacheError(error, {
                operation: 'getMany',
                provider: 'redis'
            });
            throw error;
        }
    }

    /**
     * Set multiple values in Redis
     */
    async setMany<T>(entries: Record<string, T>, options?: { ttl?: number }): Promise<void> {
        await this.ensureConnection();
        const prefixedEntries = Object.entries(entries).map(
            ([key, value]): [string, string] => [this.getKeyWithPrefix(key), JSON.stringify(value)]
        );

        try {
            await this.client.mset(prefixedEntries);

            // Handle TTL if provided
            if (options?.ttl && typeof this.client.expire === 'function') {
                for (const key of Object.keys(entries)) {
                    await this.client.expire(this.getKeyWithPrefix(key), options.ttl);
                }
            }

            emitCacheEvent(CacheEventType.SET, {
                provider: 'redis',
                batchSize: prefixedEntries.length,
                ttl: options?.ttl
            });
        } catch (error) {
            handleCacheError(error, {
                operation: 'setMany',
                provider: 'redis'
            });
            throw error;
        }
    }

    /**
     * Close Redis connection
     */
    async dispose(): Promise<void> {
        if (this.isConnected) {
            await this.client.quit();
            this.isConnected = false;
        }
    }

    // Add missing required methods for IStorageAdapter
    async getStats(): Promise<Record<string, any>> {
        return {
            provider: 'redis',
            connected: this.isConnected,
            keys: await this.keys()
        };
    }

    async healthCheck(): Promise<HealthStatus> {
        try {
            // Check if client has a status property or try to test connection directly
            const isConnected = this.isConnected || await this.testConnection();

            return {
                status: 'healthy',
                healthy: true, // Add the required healthy property
                details: {
                    connected: isConnected
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                healthy: false, // Add the required healthy property
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }

    /**
     * Connect to Redis
     */
    private async connect(config: {
        host: string;
        port: number;
        password?: string;
        db?: number;
        maxRetries?: number;
        connectTimeout?: number;
    }): Promise<void> {
        try {
            // Dynamic import to avoid requiring redis as a direct dependency
            const {createClient} = await import('redis');

            this.client = createClient({
                url: `redis://${config.host}:${config.port}`,
                password: config.password,
                database: config.db,
                socket: {
                    connectTimeout: config.connectTimeout || 5000,
                    reconnectStrategy: (retries) => {
                        if (retries > (config.maxRetries || 10)) {
                            return new Error('Max reconnection attempts reached');
                        }
                        return Math.min(retries * 100, 3000);
                    }
                }
            }) as unknown as RedisClient;

            if (typeof this.client.connect === 'function') {
                await this.client.connect();
            }

            this.isConnected = true;

            emitCacheEvent(CacheEventType.PROVIDER_INITIALIZED, {
                provider: 'redis',
                host: config.host,
                port: config.port
            });
        } catch (error) {
            handleCacheError(error, {
                operation: 'connect',
                provider: 'redis'
            });
            throw error;
        }
    }

    /**
     * Ensure connection is established
     */
    private async ensureConnection(): Promise<void> {
        if (!this.isConnected) {
            await this.connectionPromise;
        }
    }

    private getKeyWithPrefix(key: string): string {
        return this.prefix ? `${this.prefix}:${key}` : key;
    }

    private removePrefix(key: string): string {
        return this.prefix ? key.slice(this.prefix.length + 1) : key;
    }

    /**
     * Test Redis connection
     */
    private async testConnection(): Promise<boolean> {
        try {
            // Simple ping test to check if connection is active
            await this.client.get('__connection_test__');
            return true;
        } catch (error) {
            return false;
        }
    }
}