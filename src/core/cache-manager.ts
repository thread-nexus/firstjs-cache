/**
 * @fileoverview Enhanced cache manager implementation
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */

import { ICacheManager } from '../interfaces/i-cache-manager';
import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheError, CacheErrorCode, createCacheError } from '../utils/error-utils';
import { CacheMonitor } from '../utils/monitoring-utils';
import { Serializer } from '../utils/serialization-utils';
import { RateLimiter } from '../utils/rate-limiter';
import { CacheStats, CacheOptions, EntryMetadata, PerformanceMetrics } from '../types/common';
import { CircuitBreaker } from '../utils/circuit-breaker';

// Configuration interface for the cache manager
interface CacheManagerConfig {
  providers: Record<string, any>;
  monitoring?: any;
  serialization?: any;
  rateLimit?: any;
  circuitBreaker?: any;
}

// Define missing types locally if they aren't exported from common
interface GetOptions extends CacheOptions {
  fallback?: () => Promise<any>;
  provider?: string;
}

interface SetOptions extends CacheOptions {
  ttl?: number;
  tags?: string[];
  provider?: string;
}

interface BatchOptions extends CacheOptions {
  maxBatchSize?: number;
  provider?: string;
}

interface BatchOperation {
  type: 'get' | 'set' | 'delete';
  key: string;
  value?: any;
  options?: any;
}

interface BatchResult {
  key: string;
  success: boolean;
  value?: any;
  error?: string;
}

export class CacheManager implements ICacheManager {
  private providers: Map<string, ICacheProvider>;
  private monitor: CacheMonitor;
  private serializer: Serializer;
  private rateLimiter: RateLimiter;
  private circuitBreaker: CircuitBreaker;

  constructor(config: CacheManagerConfig) {
    this.providers = new Map();
    this.monitor = CacheMonitor.getInstance(config.monitoring);
    this.serializer = new Serializer(config.serialization);
    this.rateLimiter = new RateLimiter(config.rateLimit);
    this.circuitBreaker = new CircuitBreaker(config.circuitBreaker);
    this.initializeProviders(config.providers);
  }

  private initializeProviders(providerConfigs: Record<string, any>): void {
    for (const [name, config] of Object.entries(providerConfigs)) {
      try {
        const Provider = require(`../providers/${name}-provider`).default;
        const provider = new Provider(config);
        this.providers.set(name, provider);
      } catch (error) {
        console.error(`Failed to initialize provider ${name}:`, error);
      }
    }
  }

  async delete(key: string): Promise<boolean> {
    await this.rateLimiter.checkLimit('delete');
    const startTime = performance.now();

    try {
      this.validateKey(key);
      const provider = this.selectProvider();
      const result = await provider.delete(key);
      
      this.monitor.recordMetrics('delete', {
        duration: performance.now() - startTime,
        success: result,
        hits: 0,
        misses: 0,
        latency: { avg: 0, min: 0, max: 0, count: 1 },
        memoryUsage: 0,
        timestamp: Date.now()
      });
      
      return result;
    } catch (error) {
      this.handleError('delete', error as Error, { key });
      return false;
    }
  }

  async clear(): Promise<void> {
    await this.rateLimiter.checkLimit('clear');
    const startTime = performance.now();

    try {
      const provider = this.selectProvider();
      await provider.clear();
      
      this.monitor.recordMetrics('clear', {
        duration: performance.now() - startTime,
        latency: { avg: 0, min: 0, max: 0, count: 1 },
        memoryUsage: 0,
        hits: 0,
        misses: 0,
        success: true,
        timestamp: Date.now()
      });
    } catch (error) {
      this.handleError('clear', error as Error);
    }
  }

  async getStats(): Promise<Record<string, CacheStats>> {
    const result: Record<string, CacheStats> = {};
    try {
      const provider = this.getProvider('default'); // Provide a default provider name
      
      if (provider !== null && typeof provider.getStats === 'function') {
        const providerStats = await provider.getStats();
        result['default'] = providerStats;
      } else {
        // Return default stats if method doesn't exist
        result['default'] = {
          hits: 0,
          misses: 0,
          size: 0,
          memoryUsage: 0,
          lastUpdated: Date.now(),
          keyCount: 0,
          entries: 0,
          avgTtl: 0,
          maxTtl: 0
        };
      }
      
      return result;
    } catch (error) {
      console.error('Error getting cache stats:', error);
      // Return default stats on error
      return {
        'default': {
          hits: 0,
          misses: 0,
          size: 0,
          memoryUsage: 0,
          lastUpdated: Date.now(),
          keyCount: 0,
          entries: 0,
          avgTtl: 0,
          maxTtl: 0
        }
      };
    }
  }

  async getOrCompute<T = any>(
    key: string,
    fn: () => Promise<T>,
    options?: CacheOptions
  ): Promise<T> {
    await this.rateLimiter.checkLimit('compute');
    const startTime = performance.now();

    try {
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      const value = await fn();
      await this.set(key, value, options);
      
      this.monitor.recordMetrics('compute', {
        duration: performance.now() - startTime,
        success: true,
        hits: 0,
        misses: 1,
        latency: { avg: 0, min: 0, max: 0, count: 1 },
        memoryUsage: 0,
        timestamp: Date.now()
      });
      
      return value;
    } catch (error) {
      this.handleError('compute', error as Error, { key });
      throw error;
    }
  }

  wrap<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    keyGenerator?: (...args: Parameters<T>) => string,
    options?: CacheOptions
  ): T & { invalidateCache: (...args: Parameters<T>) => Promise<void> } {
    const wrapped = async (...args: Parameters<T>) => {
      // Implementation
      return fn(...args);
    };
    
    const invalidateCache = async (...args: Parameters<T>) => {
      // Implementation
    };
    
    return Object.assign(wrapped, { invalidateCache }) as T & { 
      invalidateCache: (...args: Parameters<T>) => Promise<void> 
    };
  }

  async invalidateByTag(tag: string): Promise<void> {
    const startTime = performance.now();
    await this.executeWithMetrics('invalidateByTag', async () => {
      const provider = this.selectProvider();
      // Implementation would go here
    }, { tag });
  }

  async invalidateByPrefix(prefix: string): Promise<void> {
    const startTime = performance.now();
    const provider = this.selectProvider();
    
    // Get all keys (ensure provider has keys method or use a default empty array)
    const keys = provider.keys ? await provider.keys() : [];
    const toDelete = keys.filter((key: string) => key.startsWith(prefix));
    await Promise.all(toDelete.map((key: string) => this.delete(key)));
    
    this.monitor.recordMetrics('invalidateByPrefix', {
      duration: performance.now() - startTime,
      latency: { avg: 0, min: 0, max: 0, count: 1 },
      memoryUsage: 0,
      hits: 0,
      misses: 0,
      success: true,
      timestamp: Date.now()
    });
  }

  getProvider(name: string): ICacheProvider | null {
    return this.providers.get(name) || null;
  }

  // Removed duplicate async implementation to resolve the conflict.

  getMetadata(key: string): EntryMetadata | undefined {
    try {
      const provider = this.getProvider('default');
      if (!provider || typeof provider.getMetadata !== 'function') {
        return undefined;
      }

      const metadata = provider.getMetadata(key);
      if (metadata && 
          typeof metadata === 'object' && 
          'tags' in metadata && 
          'createdAt' in metadata && 
          'size' in metadata && 
          'lastAccessed' in metadata && 
          'accessCount' in metadata) {
        return metadata as EntryMetadata;
      }

      return undefined;
    } catch (error) {
      console.error('Error getting metadata:', error);
      return undefined;
    }
  }

  async deleteByPattern(pattern: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  async keys(pattern?: string): Promise<string[]> {
    throw new Error('Method not implemented.');
  }

  async getMany(keys: string[]): Promise<Record<string, any>> {
    throw new Error('Method not implemented.');
  }

  async setMany(entries: Record<string, any>, options?: CacheOptions): Promise<void> {
    throw new Error('Method not implemented.');
  }

  /**
   * Enhanced get operation with monitoring and error handling
   */
  public async get<T>(key: string, options?: GetOptions): Promise<T | null> {
    await this.rateLimiter.checkLimit('get');
    const startTime = performance.now();

    try {
      this.validateKey(key);
      const provider = this.selectProvider(options?.provider);
      
      if (this.circuitBreaker.isOpen()) {
        throw new CacheError(
          CacheErrorCode.CIRCUIT_OPEN,
          `Circuit breaker open for provider ${provider.name}`
        );
      }

      const result = await provider.get(key);
      
      if (result === null && options?.fallback) {
        return this.handleFallback<T>(key, options);
      }

      const value = result ? await this.serializer.deserialize<T>(result) : null;
      const isHit = value !== null;
      
      this.monitor.recordMetrics('get', {
        duration: performance.now() - startTime,
        latency: { avg: 0, min: 0, max: 0, count: 1 },
        memoryUsage: 0,
        hits: isHit ? 1 : 0,
        misses: isHit ? 0 : 1,
        success: true,
        timestamp: Date.now()
      });

      return value;
    } catch (error) {
      this.handleError('get', error as Error, { key });
      return null;
    }
  }

  /**
   * Enhanced set operation with validation and compression
   */
  public async set<T>(
    key: string,
    value: T,
    options?: SetOptions
  ): Promise<void> {
    await this.rateLimiter.checkLimit('set');
    const startTime = performance.now();

    try {
      this.validateKey(key);
      this.validateValue(value);

      const serialized = await this.serializer.serialize(value);
      const provider = this.selectProvider(options?.provider);

      await provider.set(key, serialized, {
        ttl: options?.ttl,
        tags: options?.tags
      });

      const dataSize = typeof serialized.data === 'string' 
        ? Buffer.byteLength(serialized.data) 
        : serialized.metadata?.size || 0;

      this.monitor.recordMetrics('set', {
        duration: performance.now() - startTime,
        latency: { avg: 0, min: 0, max: 0, count: 1 },
        memoryUsage: 0,
        hits: 0,
        misses: 0,
        success: true,
        timestamp: Date.now(),
        size: dataSize
      });
    } catch (error) {
      this.handleError('set', error as Error, { key, value });
    }
  }

  /**
   * Enhanced batch operations
   */
  public async batch<T>(
    operations: BatchOperation[],
    options?: BatchOptions
  ): Promise<BatchResult[]> {
    const startTime = performance.now();
    const results: BatchResult[] = [];

    try {
      await this.rateLimiter.checkLimit('batch', operations.length);
      const provider = this.selectProvider(options?.provider);

      const batches = this.splitIntoBatches(
        operations,
        options?.maxBatchSize || 100
      );

      for (const batch of batches) {
        const batchResults = await this.executeBatch<T>(batch, provider);
        results.push(...batchResults);
      }

      this.monitor.recordMetrics('batch', {
        duration: performance.now() - startTime,
        operationCount: operations.length,
        hits: 0,
        misses: 0,
        latency: { avg: 0, min: 0, max: 0, count: 1 },
        memoryUsage: 0,
        success: true,
        timestamp: Date.now()
      });

      return results;
    } catch (error) {
      this.handleError('batch', error as Error);
      return results;
    }
  }

  private async executeBatch<T>(
    operations: BatchOperation[],
    provider: ICacheProvider
  ): Promise<BatchResult[]> {
    const results: BatchResult[] = [];
    
    for (const op of operations) {
      try {
        switch (op.type) {
          case 'get':
            results.push({
              key: op.key,
              success: true,
              value: await this.get(op.key, op.options)
            });
            break;
          case 'set':
            await this.set(op.key, op.value, op.options);
            results.push({
              key: op.key,
              success: true
            });
            break;
          case 'delete':
            const deleted = await this.delete(op.key);
            results.push({
              key: op.key,
              success: deleted
            });
            break;
        }
      } catch (error) {
        results.push({
          key: op.key,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return results;
  }

  private validateKey(key: string): void {
    if (!key || typeof key !== 'string') {
      throw new CacheError(
        CacheErrorCode.INVALID_KEY,
        'Invalid cache key'
      );
    }

    if (key.length > 250) {
      throw new CacheError(
        CacheErrorCode.KEY_TOO_LONG,
        'Cache key exceeds maximum length'
      );
    }
  }

  private validateValue(value: any): void {
    if (value === undefined) {
      throw new CacheError(
        CacheErrorCode.INVALID_ARGUMENT,
        'Cannot cache undefined value'
      );
    }
  }

  private selectProvider(preferredProvider?: string): ICacheProvider {
    if (preferredProvider) {
      const provider = this.providers.get(preferredProvider);
      if (provider) return provider;
    }

    // Select first available provider
    const provider = Array.from(this.providers.values())[0];
    if (!provider) {
      throw new CacheError(
        CacheErrorCode.PROVIDER_ERROR,
        'No cache provider available'
      );
    }

    return provider;
  }

  private handleError(
    operation: string,
    error: Error,
    context?: Record<string, any>
  ): void {
    const cacheError = error instanceof CacheError ? error :
      new CacheError(
        CacheErrorCode.UNKNOWN,
        error.message,
        { operation, ...context }
      );

    const metrics: PerformanceMetrics = {
      duration: performance.now() - (context?.startTime || 0),
      hits: 0,
      misses: 1,
      latency: { avg: 0, min: 0, max: 0, count: 1 },
      memoryUsage: 0,
      timestamp: Date.now(),
      success: false,
      error: true
    };

    this.monitor.recordMetrics(operation, metrics);

    throw cacheError;
  }

  private splitIntoBatches<T>(operations: T[], maxBatchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < operations.length; i += maxBatchSize) {
      batches.push(operations.slice(i, i + maxBatchSize));
    }
    
    return batches;
  }

  private async handleFallback<T>(key: string, options?: CacheOptions): Promise<T | null> {
    // Implement fallback logic
    return null;
  }

  private async executeWithMetrics(operation: string, fn: () => Promise<any>, context?: Record<string, any>) {
    const startTime = performance.now();
    try {
      const result = await fn();
      this.monitor.recordMetrics(operation, {
        duration: performance.now() - startTime,
        latency: { avg: 0, min: 0, max: 0, count: 1 },
        memoryUsage: 0,
        hits: 0,
        misses: 0,
        success: true,
        timestamp: Date.now(),
        ...context
      });
      return result;
    } catch (error) {
      this.monitor.recordMetrics(operation, {
        duration: performance.now() - startTime,
        latency: { avg: 0, min: 0, max: 0, count: 1 },
        memoryUsage: 0,
        hits: 0,
        misses: 0,
        success: false,
        error: true,
        timestamp: Date.now(),
        ...context
      });
      throw error;
    }
  }
}