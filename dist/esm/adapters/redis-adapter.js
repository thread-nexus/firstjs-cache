/**
 * @fileoverview Redis storage adapter implementation with connection pooling
 * and optimized batch operations.
 */
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { handleCacheError } from '../utils/error-utils';
export class RedisAdapter {
    constructor(config) {
        this.name = 'redis';
        this.isConnected = false;
        this.prefix = config.prefix || '';
        this.connectionPromise = this.connect(config.redis);
    }
    /**
     * Connect to Redis
     */
    async connect(config) {
        try {
            // Dynamic import to avoid requiring redis as a direct dependency
            const { createClient } = await import('redis');
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
            });
            if (typeof this.client.connect === 'function') {
                await this.client.connect();
            }
            this.isConnected = true;
            emitCacheEvent(CacheEventType.PROVIDER_INITIALIZED, {
                provider: 'redis',
                host: config.host,
                port: config.port
            });
        }
        catch (error) {
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
    async ensureConnection() {
        if (!this.isConnected) {
            await this.connectionPromise;
        }
    }
    /**
     * Get value from Redis
     */
    async get(key) {
        await this.ensureConnection();
        const prefixedKey = this.getKeyWithPrefix(key);
        try {
            const value = await this.client.get(prefixedKey);
            emitCacheEvent(value !== null ? CacheEventType.GET_HIT : CacheEventType.GET_MISS, { key, provider: 'redis' });
            return value === null ? null : JSON.parse(value);
        }
        catch (error) {
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
    async set(key, value, options) {
        await this.ensureConnection();
        const prefixedKey = this.getKeyWithPrefix(key);
        try {
            const stringValue = JSON.stringify(value);
            if (options?.ttl) {
                await this.client.set(prefixedKey, stringValue, { EX: options.ttl });
            }
            else {
                await this.client.set(prefixedKey, stringValue);
            }
            emitCacheEvent(CacheEventType.SET, {
                key,
                provider: 'redis',
                ttl: options?.ttl
            });
        }
        catch (error) {
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
    async has(key) {
        await this.ensureConnection();
        const prefixedKey = this.getKeyWithPrefix(key);
        try {
            const exists = await this.client.exists(prefixedKey);
            return exists === 1;
        }
        catch (error) {
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
    async delete(key) {
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
        }
        catch (error) {
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
    async clear() {
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
        }
        catch (error) {
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
    async keys(pattern) {
        await this.ensureConnection();
        const prefixedPattern = pattern
            ? this.getKeyWithPrefix(pattern.replace('*', '\\*'))
            : (this.prefix ? `${this.prefix}:*` : '*');
        try {
            const keys = await this.client.keys(prefixedPattern);
            return keys.map(key => this.removePrefix(key));
        }
        catch (error) {
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
    async getMany(keys) {
        await this.ensureConnection();
        const prefixedKeys = keys.map(key => this.getKeyWithPrefix(key));
        try {
            const values = await this.client.mget(prefixedKeys);
            const result = {};
            keys.forEach((key, index) => {
                result[key] = values[index] ? JSON.parse(values[index]) : null;
            });
            return result;
        }
        catch (error) {
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
    async setMany(entries, options) {
        await this.ensureConnection();
        const prefixedEntries = Object.entries(entries).map(([key, value]) => [this.getKeyWithPrefix(key), JSON.stringify(value)]);
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
        }
        catch (error) {
            handleCacheError(error, {
                operation: 'setMany',
                provider: 'redis'
            });
            throw error;
        }
    }
    getKeyWithPrefix(key) {
        return this.prefix ? `${this.prefix}:${key}` : key;
    }
    removePrefix(key) {
        return this.prefix ? key.slice(this.prefix.length + 1) : key;
    }
    /**
     * Close Redis connection
     */
    async dispose() {
        if (this.isConnected) {
            await this.client.quit();
            this.isConnected = false;
        }
    }
    // Add missing required methods for IStorageAdapter
    async getStats() {
        return {
            provider: 'redis',
            connected: this.isConnected,
            keys: await this.keys()
        };
    }
    /**
     * Test Redis connection
     */
    async testConnection() {
        try {
            // Simple ping test to check if connection is active
            await this.client.get('__connection_test__');
            return true;
        }
        catch (error) {
            return false;
        }
    }
    async healthCheck() {
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
        }
        catch (error) {
            return {
                status: 'unhealthy',
                healthy: false, // Add the required healthy property
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
}
//# sourceMappingURL=redis-adapter.js.map