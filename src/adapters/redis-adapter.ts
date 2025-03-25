/**
 * @fileoverview Redis storage adapter implementation with connection pooling
 * and optimized batch operations.
 */

import {IStorageAdapter} from '../interfaces/i-storage-adapter';
import {CacheEventType, emitCacheEvent} from '../events/cache-events';
import {handleCacheError} from '../utils/error-utils';
import {HealthStatus} from '../types';
import {metrics} from "../utils/metrics";
import {logger} from "../utils/logger";

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

    ping?(): Promise<string>;
}

export class RedisAdapter implements IStorageAdapter {
    readonly name: string = 'redis';
    private client!: RedisClient;
    private readonly prefix: string;
    private readonly connectionPromise: Promise<void>;
    private isConnected = false;
    private config: string | undefined;

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
        
        // Start timer for tracking Redis operations
        const startTime = performance.now();
        let success = false;

        try {
            const value = await this.client.get(prefixedKey);
            const duration = performance.now() - startTime;
            
            // Record Redis operation metrics
            metrics.timer('redis.command.get', duration, {
                hit: value !== null ? 'hit' : 'miss',
                provider: 'redis'
            });
            
            // Log for slow operations
            if (duration > 100) { // Log slow operations > 100ms
                logger.warn(`Slow Redis GET operation`, {
                    key,
                    duration,
                    provider: 'redis'
                });
            }
            
            // Track hits and misses
            if (value !== null) {
                metrics.increment('redis.hits', 1);
                success = true;
            } else {
                metrics.increment('redis.misses', 1);
            }

            emitCacheEvent(
                value !== null ? CacheEventType.GET_HIT : CacheEventType.GET_MISS,
                {key, provider: 'redis', duration}
            );

            return value === null ? null : JSON.parse(value) as T;
        } catch (error) {
            const duration = performance.now() - startTime;
            
            // Record error metrics
            metrics.timer('redis.command.get', duration, {
                hit: 'error',
                provider: 'redis'
            });
            metrics.increment('redis.errors', 1, {
                operation: 'get',
                errorType: error instanceof Error ? error.name : 'unknown'
            });
            
            handleCacheError(error, {
                operation: 'get',
                key,
                provider: 'redis',
                duration
            }, false);
            
            // Check if we should try to reconnect
            await this.handlePotentialConnectionError(error);
            
            throw error;
        } finally {
            // Track overall Redis operation rates
            metrics.increment('redis.operations', 1, {
                operation: 'get',
                success: success ? 'true' : 'false'
            });
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
            }, false);
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
            }, false);
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
            }, false);
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
            }, false);
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
            }, false);
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
            }, false);
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
                keys: Object.keys(entries), // Use keys array instead of batchSize
                ttl: options?.ttl
            });
        } catch (error) {
            handleCacheError(error, {
                operation: 'setMany',
                provider: 'redis'
            }, false);
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

    /**
     * Perform a health check on the Redis connection
     * 
     * @returns Health status
     */
    async healthCheck(): Promise<HealthStatus> {
        try {
            // Check if Redis is connected
            const pingResult = this.client.ping ? await this.client.ping() : 'PONG';
            
            if (pingResult === 'PONG') {
                return {
                    status: 'healthy',
                    healthy: true,
                    timestamp: Date.now(),
                    lastCheck: Date.now(),
                    details: { connected: true }
                };
            } else {
                return {
                    status: 'unhealthy',
                    healthy: false,
                    timestamp: Date.now(),
                    lastCheck: Date.now(),
                    error: 'Redis did not respond with PONG'
                };
            }
        } catch (error) {
            return {
                status: 'unhealthy',
                healthy: false,
                timestamp: Date.now(),
                lastCheck: Date.now(),
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
                key: 'redis-init'  // Add a key instead of host/port
            });
        } catch (error) {
            handleCacheError(error, {
                operation: 'connect',
                provider: 'redis'
            }, false);
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

    /**
     * Handle potential connection error and try to reconnect if needed
     */
    private async handlePotentialConnectionError(error: unknown): Promise<void> {
        // Check if the error looks like a connection issue
        const isConnectionError = error instanceof Error && (
            error.message.includes('connection') ||
            error.message.includes('network') ||
            error.message.includes('timeout') ||
            error.message.includes('disconnected') ||
            error.message.includes('ECONNREFUSED')
        );
        
        if (isConnectionError) {
            logger.warn(`Redis connection error detected, attempting to reconnect`, {
                error: error instanceof Error ? error.message : String(error)
            });
            
            metrics.increment('redis.connection_errors', 1);
            
            // Mark connection as broken
            this.isConnected = false;
            
            // Try to reconnect in the background
            setTimeout(() => {
                this.retryConnection()
                    .catch(err => {
                        logger.error(`Failed to reconnect to Redis`, {
                            error: err instanceof Error ? err.message : String(err)
                        });
                    });
            }, 1000); // Wait 1 second before trying to reconnect
        }
    }

    /**
     * Retry connection with backoff
     */
    private async retryConnection(
        attempts: number = 5,
        initialDelay: number = 1000
    ): Promise<void> {
        let delay = initialDelay;
        
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                logger.info(`Attempting to reconnect to Redis (attempt ${attempt}/${attempts})`, {
                    delay
                });
                
                await this.connect({
                    host: (this.config as any).host,
                    port: (this.config as any).port,
                    password: (this.config as any).password,
                    db: Number((this.config as any).db ?? 0)
                });
                
                logger.info(`Successfully reconnected to Redis after ${attempt} attempts`);
                metrics.increment('redis.reconnections', 1, {
                    attempts: attempt.toString()
                });
                
                return;
            } catch (error) {
                logger.error(`Failed to reconnect to Redis (attempt ${attempt}/${attempts})`, {
                    error: error instanceof Error ? error.message : String(error)
                });
                
                if (attempt === attempts) {
                    metrics.increment('redis.reconnection_failures', 1);
                    throw error;
                }
                
                // Exponential backoff with 50% jitter
                const jitter = 0.5 * Math.random() * delay;
                delay = Math.min(delay * 2 + jitter, 30000); // Cap at 30 seconds
                
                // Wait before the next attempt
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
}