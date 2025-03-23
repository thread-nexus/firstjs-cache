/**
 * @fileoverview Redis storage adapter implementation with connection pooling
 * and optimized batch operations.
 */

import { IStorageAdapter, StorageAdapterConfig } from '../interfaces/storage-adapter';
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { handleCacheError } from '../utils/error-utils';

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
}

export class RedisAdapter implements IStorageAdapter {
  private client: RedisClient;
  private readonly prefix: string;
  private readonly connectionPromise: Promise<void>;
  private isConnected = false;

  constructor(
    config: StorageAdapterConfig & {
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
      }) as unknown as RedisClient;

      await this.client.connect();
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

  /**
   * Get value from Redis
   */
  async get(key: string): Promise<string | null> {
    await this.ensureConnection();
    const prefixedKey = this.getKeyWithPrefix(key);

    try {
      const value = await this.client.get(prefixedKey);
      
      emitCacheEvent(
        value !== null ? CacheEventType.GET_HIT : CacheEventType.GET_MISS,
        { key, provider: 'redis' }
      );

      return value;
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
  async set(key: string, value: string, ttl?: number): Promise<void> {
    await this.ensureConnection();
    const prefixedKey = this.getKeyWithPrefix(key);

    try {
      await this.client.set(prefixedKey, value, ttl ? { EX: ttl } : undefined);
      
      emitCacheEvent(CacheEventType.SET, {
        key,
        provider: 'redis',
        ttl
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
        pattern,
        provider: 'redis'
      });
      throw error;
    }
  }

  /**
   * Get multiple values from Redis
   */
  async getMany(keys: string[]): Promise<Record<string, string | null>> {
    await this.ensureConnection();
    const prefixedKeys = keys.map(key => this.getKeyWithPrefix(key));

    try {
      const values = await this.client.mget(prefixedKeys);
      const result: Record<string, string | null> = {};
      
      keys.forEach((key, index) => {
        result[key] = values[index];
      });

      return result;
    } catch (error) {
      handleCacheError(error, {
        operation: 'getMany',
        keys,
        provider: 'redis'
      });
      throw error;
    }
  }

  /**
   * Set multiple values in Redis
   */
  async setMany(entries: Record<string, string>, ttl?: number): Promise<void> {
    await this.ensureConnection();
    const prefixedEntries = Object.entries(entries).map(
      ([key, value]) => [this.getKeyWithPrefix(key), value]
    );

    try {
      await this.client.mset(prefixedEntries);
      
      if (ttl) {
        await Promise.all(
          prefixedEntries.map(([key]) =>
            this.client.expire(key, ttl)
          )
        );
      }

      emitCacheEvent(CacheEventType.SET, {
        provider: 'redis',
        batchSize: prefixedEntries.length,
        ttl
      });
    } catch (error) {
      handleCacheError(error, {
        operation: 'setMany',
        entries: Object.keys(entries),
        provider: 'redis'
      });
      throw error;
    }
  }

  private getKeyWithPrefix(key: string): string {
    return this.prefix ? `${this.prefix}:${key}` : key;
  }

  private removePrefix(key: string): string {
    return this.prefix ? key.slice(this.prefix.length + 1) : key;
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
}