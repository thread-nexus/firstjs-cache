/**
 * @fileoverview Advanced cache operations like atomic updates, transactions, and batch processing
 */

import { MemoryStorageAdapter } from '../adapters/memory-adapter';
import { CacheOptions } from '../types/common';
import { CacheTransactionOperation } from '../types/cache-types';
import { handleCacheError } from '../utils/error-utils';

/**
 * Cache manager operations for advanced functionality
 */
export class CacheManagerOperations {
  private locks = new Map<string, Promise<any>>();

  /**
   * Create a new cache operations manager
   * 
   * @param provider - Cache provider to use
   */
  constructor(private provider: MemoryStorageAdapter) {}

  /**
   * Perform an atomic operation on a cache value
   * 
   * @param key - Cache key
   * @param operation - Atomic operation function
   * @param options - Cache options
   * @returns Result of the operation
   */
  async atomic<T>(
    key: string,
    operation: (currentValue: T | null) => Promise<T> | T,
    options?: CacheOptions
  ): Promise<T> {
    // Create a lock for this key if it doesn't exist
    if (!this.locks.has(key)) {
      this.locks.set(key, Promise.resolve());
    }

    // Get the current lock
    const currentLock = await this.locks.get(key)!;

    // Create a new lock that will resolve when our operation is complete
    let resolveLock: (value: any) => void;
    const newLock = new Promise(resolve => {
      resolveLock = resolve;
    });

    // Update the lock for this key
    this.locks.set(key, newLock);

    try {
      // Wait for the previous operation to complete
      await currentLock;

      // Perform our operation
      const currentValue = await this.provider.get<T>(key);
      const newValue = await operation(currentValue);
      await this.provider.set(key, newValue);
      
      // Resolve our lock
      resolveLock!(null);
      
      return newValue;
    } catch (error) {
      // Resolve our lock even if there's an error
      resolveLock!(null);
      
      handleCacheError(error, { operation: 'atomic', key });
      throw error;
    }
  }

  /**
   * Increment a numeric value
   * 
   * @param key - Cache key
   * @param amount - Amount to increment by
   * @param options - Cache options
   * @returns New value
   */
  async increment(
    key: string,
    amount: number = 1,
    options?: CacheOptions
  ): Promise<number> {
    return this.atomic<number>(
      key,
      (current) => (current || 0) + amount,
      options
    );
  }

  /**
   * Decrement a numeric value
   * 
   * @param key - Cache key
   * @param amount - Amount to decrement by
   * @param options - Cache options
   * @returns New value
   */
  async decrement(
    key: string,
    amount: number = 1,
    options?: CacheOptions
  ): Promise<number> {
    return this.atomic<number>(
      key,
      (current) => (current || 0) - amount,
      options
    );
  }

  /**
   * Update specific fields in an object
   * 
   * @param key - Cache key
   * @param fields - Fields to update
   * @param options - Cache options
   * @returns Updated object
   */
  async updateFields<T extends Record<string, any>>(
    key: string,
    fields: Partial<T>,
    options?: CacheOptions
  ): Promise<T> {
    return this.atomic<T>(
      key,
      (current) => ({ ...(current || {} as T), ...fields }),
      options
    );
  }

  /**
   * Add items to an array
   * 
   * @param key - Cache key
   * @param items - Items to add
   * @param options - Cache options with optional maxLength
   * @returns Updated array
   */
  async arrayAppend<T>(
    key: string,
    items: T[],
    options?: CacheOptions & { maxLength?: number }
  ): Promise<T[]> {
    const { maxLength, ...cacheOptions } = options || {};

    return this.atomic<T[]>(
      key,
      (current) => {
        const array = current || [];
        const newArray = [...array, ...items];
        
        // Enforce max length if specified
        if (maxLength && newArray.length > maxLength) {
          return newArray.slice(newArray.length - maxLength);
        }
        
        return newArray;
      },
      cacheOptions
    );
  }

  /**
   * Remove items from an array
   * 
   * @param key - Cache key
   * @param predicate - Function to determine which items to remove
   * @param options - Cache options
   * @returns Updated array
   */
  async arrayRemove<T>(
    key: string,
    predicate: (item: T) => boolean,
    options?: CacheOptions
  ): Promise<T[]> {
    return this.atomic<T[]>(
      key,
      (current) => {
        if (!current) return [];
        return current.filter(item => !predicate(item));
      },
      options
    );
  }

  /**
   * Perform set operations on arrays
   * 
   * @param key - Cache key
   * @param operation - Set operation type
   * @param items - Items to operate with
   * @param options - Cache options
   * @returns Result of set operation
   */
  async setOperations<T>(
    key: string,
    operation: 'union' | 'intersection' | 'difference',
    items: T[],
    options?: CacheOptions
  ): Promise<T[]> {
    return this.atomic<T[]>(
      key,
      (current) => {
        const currentArray = current || [];
        const itemsSet = new Set(items);
        
        switch (operation) {
          case 'union':
            return [...new Set([...currentArray, ...items])];
            
          case 'intersection':
            // Only return elements that exist in both arrays
            return currentArray.filter(item => itemsSet.has(item));
            
          case 'difference':
            // Only return elements from current that don't exist in items
            return currentArray.filter(item => !itemsSet.has(item));
            
          default:
            throw new Error(`Unknown set operation: ${operation}`);
        }
      },
      options
    );
  }

  /**
   * Perform a batch get operation
   * 
   * @param keys - Keys to get
   * @returns Object mapping keys to values
   */
  async batchGet<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      if (this.provider.getMany) {
        return await this.provider.getMany<T>(keys);
      }
      
      const result: Record<string, T | null> = {};
      for (const key of keys) {
        result[key] = await this.provider.get<T>(key);
      }
      return result;
    } catch (error) {
      handleCacheError(error, { operation: 'batchGet', keys });
      throw error;
    }
  }

  /**
   * Perform a batch set operation
   * 
   * @param entries - Key-value pairs to set
   * @param options - Cache options
   */
  async batchSet<T>(
    entries: Record<string, T>,
    options?: CacheOptions & { 
      batchSize?: number;
      retries?: number;
      retryDelay?: number;
    }
  ): Promise<void> {
    try {
      if (this.provider.setMany) {
        await this.provider.setMany(entries);
        return;
      }
      
      for (const [key, value] of Object.entries(entries)) {
        await this.provider.set(key, value);
      }
    } catch (error) {
      handleCacheError(error, { operation: 'batchSet', keys: Object.keys(entries) });
      throw error;
    }
  }

  /**
   * Execute a transaction of multiple cache operations
   * 
   * @param operations - List of operations to perform
   * @param options - Transaction options
   * @returns Results of operations
   */
  async transaction(
    operations: CacheTransactionOperation[],
    options?: { atomic?: boolean }
  ): Promise<any[]> {
    const results: any[] = [];
    
    try {
      for (const op of operations) {
        const result = await this.executeOperation(op);
        if (op.type === 'get') {
          results.push(result);
        }
      }
      
      return results;
    } catch (error) {
      handleCacheError(error, { operation: 'transaction' });
      throw error;
    }
  }

  /**
   * Execute a single operation in a transaction
   */
  private async executeOperation(op: CacheTransactionOperation): Promise<any> {
    switch (op.type) {
      case 'get':
        return await this.provider.get(op.key);
      case 'set':
        await this.provider.set(op.key, op.value!, op.options?.ttl);
        break;
      case 'delete':
        await this.provider.delete(op.key);
        break;
      case 'has':
        return await this.provider.has(op.key);
      default:
        throw new Error(`Unknown operation type: ${(op as any).type}`);
    }
  }
}