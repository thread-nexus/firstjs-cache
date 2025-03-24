/**
 * @fileoverview Redis storage adapter implementation with connection pooling
 * and optimized batch operations.
 */
import { IStorageAdapter } from '../interfaces/i-storage-adapter';
import { HealthStatus } from '../types/index';
export declare class RedisAdapter implements IStorageAdapter {
    readonly name: string;
    private client;
    private readonly prefix;
    private readonly connectionPromise;
    private isConnected;
    constructor(config: {
        prefix?: string;
        redis: {
            host: string;
            port: number;
            password?: string;
            db?: number;
            maxRetries?: number;
            connectTimeout?: number;
        };
    });
    /**
     * Connect to Redis
     */
    private connect;
    /**
     * Ensure connection is established
     */
    private ensureConnection;
    /**
     * Get value from Redis
     */
    get<T = string>(key: string): Promise<T | null>;
    /**
     * Set value in Redis
     */
    set<T>(key: string, value: T, options?: {
        ttl?: number;
    }): Promise<void>;
    /**
     * Check if key exists in Redis
     */
    has(key: string): Promise<boolean>;
    /**
     * Delete value from Redis
     */
    delete(key: string): Promise<boolean>;
    /**
     * Clear all values with prefix
     */
    clear(): Promise<void>;
    /**
     * Get matching keys from Redis
     */
    keys(pattern?: string): Promise<string[]>;
    /**
     * Get multiple values from Redis
     */
    getMany<T = string>(keys: string[]): Promise<Record<string, T | null>>;
    /**
     * Set multiple values in Redis
     */
    setMany<T>(entries: Record<string, T>, options?: {
        ttl?: number;
    }): Promise<void>;
    private getKeyWithPrefix;
    private removePrefix;
    /**
     * Close Redis connection
     */
    dispose(): Promise<void>;
    getStats(): Promise<Record<string, any>>;
    /**
     * Test Redis connection
     */
    private testConnection;
    healthCheck(): Promise<HealthStatus>;
}
