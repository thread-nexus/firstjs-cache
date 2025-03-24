/**
 * @fileoverview Advanced cache operations implementation
 */

import { ICacheProvider } from '../interfaces/i-cache-provider';
import { CacheEventType, emitCacheEvent } from '../events/cache-events';
import { handleCacheError } from '../utils/error-utils';
import { validateCacheKey } from '../utils/validation-utils';
import { CacheOptions } from '../types/common';

/**
 * Advanced cache operations implementation
 */
export class CacheManagerOperations {
  /**
   * Create a new cache operations manager
   * 
   * @param provider - Primary cache provider
   */
  constructor(private provider: ICacheProvider) {}

  /**
   * Update specific fields in a cached object
   * 
   * @param key - Cache key
   * @param fields - Fields to update
   * @param options - Cache options
   * @returns Updated object or false if operation failed
   */
  async updateFields(
    key: string, 
    fields: Record<string, any>, 
    options?: CacheOptions
  ): Promise<Record<string, any> | boolean> {
    validateCacheKey(key);
    
    try {
      // Get the current value
      const current = await this.provider.get(key);
      
      // If key doesn't exist, create new object with fields
      if (current === null) {
        await this.provider.set(key, fields, options);
        return fields;
      }
      
      // If current value is not an object, fail
      if (typeof current !== 'object' || Array.isArray(current)) {
      return false;
    }
      
      // Update fields
      const updated = { ...current, ...fields };
      
      // Store back to cache
      await this.provider.set(key, updated, options);
      
      emitCacheEvent(CacheEventType.SET, { 
        key, 
        operation: 'updateFields',
        fieldsUpdated: Object.keys(fields)
      });
      
      return updated;
    } catch (error) {
      handleCacheError(error, { 
        operation: 'updateFields', 
        key 
      });
      return false;
    }
  }

  /**
   * Append items to an array in the cache
   * 
   * @param key - Cache key
   * @param items - Items to append
   * @param options - Cache options
   * @returns Updated array or true if operation succeeded
   */
  async arrayAppend(
    key: string, 
    items: any[], 
    options?: CacheOptions & { maxLength?: number }
  ): Promise<any[] | boolean> {
    validateCacheKey(key);
    
    try {
      // Get the current value
      const current = await this.provider.get(key);
      
      // Initialize if not exists or not an array
      const currentArray = Array.isArray(current) ? current : [];
      
      // Append items
      const updated = [...currentArray, ...items];
      
      // Apply max length if specified
      const maxLength = options?.maxLength;
      if (maxLength && maxLength > 0 && updated.length > maxLength) {
        const startIndex = updated.length - maxLength;
        const truncated = updated.slice(startIndex);
        
        // Store back to cache
        await this.provider.set(key, truncated, options);
        
      emitCacheEvent(CacheEventType.SET, { 
        key, 
          operation: 'arrayAppend',
          itemsAppended: items.length,
          truncated: true,
          maxLength
      });
      
        return truncated;
      }
      
      // Store back to cache
      await this.provider.set(key, updated, options);
      
      emitCacheEvent(CacheEventType.SET, { 
        key, 
        operation: 'arrayAppend',
        itemsAppended: items.length
      });
      return updated;
    } catch (error) {
      handleCacheError(error, { 
        operation: 'arrayAppend', 
        key 
      });
      return false;
    }
  }

  /**
   * Remove items from an array in the cache
   * 
   * @param key - Cache key
   * @param predicate - Function to determine which items to remove
   * @param options - Cache options
   * @returns Updated array or -1 if operation failed
   */
  async arrayRemove<T>(
    key: string, 
    predicate: (item: T) => boolean,
    options?: CacheOptions
  ): Promise<any[] | number> {
    validateCacheKey(key);
    
    try {
      // Get the current value
      const current = await this.provider.get<T[]>(key);
      
      // If key doesn't exist or not an array, return empty array
      if (!Array.isArray(current)) {
        return [];
}

      // Filter out items
      const originalLength = current.length;
      const updated = current.filter(item => !predicate(item));
      const removedCount = originalLength - updated.length;
      
      // Store back to cache
      await this.provider.set(key, updated, options);
      
      emitCacheEvent(CacheEventType.SET, { 
        key, 
        operation: 'arrayRemove',
        itemsRemoved: removedCount
      });
      
      return updated;
    } catch (error) {
      handleCacheError(error, { 
        operation: 'arrayRemove', 
        key 
      });
      return -1;
    }
  }

  /**
   * Increment a numeric value in the cache
   * 
   * @param key - Cache key
   * @param increment - Amount to increment (default: 1)
   * @param options - Cache options
   * @returns New value after increment, or null if operation failed
   */
  async increment(
    key: string, 
    increment: number = 1, 
    options?: CacheOptions
  ): Promise<number | null> {
    validateCacheKey(key);
    
    try {
      // Get the current value
      const current = await this.provider.get<number>(key);
      
      // Calculate new value
      const newValue = typeof current === 'number' ? current + increment : increment;
      
      // Store back to cache
      await this.provider.set(key, newValue, options);
      
      emitCacheEvent(CacheEventType.SET, { 
        key, 
        operation: 'increment',
        increment,
        newValue
      });
      
      return newValue;
    } catch (error) {
      handleCacheError(error, { 
        operation: 'increment', 
        key 
      });
      return null;
    }
  }

  /**
   * Decrement a numeric value in the cache
   * 
   * @param key - Cache key
   * @param decrement - Amount to decrement (default: 1)
   * @param options - Cache options
   * @returns New value after decrement, or null if operation failed
   */
  async decrement(
    key: string, 
    decrement: number = 1, 
    options?: CacheOptions
  ): Promise<number | null> {
    return this.increment(key, -decrement, options);
  }

  /**
   * Get and set a value atomically
   * 
   * @param key - Cache key
   * @param value - New value to set
   * @param options - Cache options
   * @returns Previous value, or null if not found
   */
  async getAndSet<T>(
    key: string, 
    value: T, 
    options?: CacheOptions
  ): Promise<T | null> {
    validateCacheKey(key);
    
    try {
      // Get the current value
      const previous = await this.provider.get<T>(key);
      
      // Set the new value
      await this.provider.set(key, value, options);
      
      emitCacheEvent(CacheEventType.SET, { 
        key, 
        operation: 'getAndSet'
      });
      
      return previous;
    } catch (error) {
      handleCacheError(error, { 
        operation: 'getAndSet', 
        key 
      });
      return null;
    }
  }

  /**
   * Set a value only if the key doesn't exist
   * 
   * @param key - Cache key
   * @param value - Value to set
   * @param options - Cache options
   * @returns Whether the value was set
   */
  async setIfNotExists<T>(
    key: string, 
    value: T, 
    options?: CacheOptions
  ): Promise<boolean> {
    validateCacheKey(key);
    
    try {
      // Check if key exists
      const exists = await this.provider.get(key) !== null;
      
      if (!exists) {
        // Set the value
        await this.provider.set(key, value, options);
        
        emitCacheEvent(CacheEventType.SET, { 
          key, 
          operation: 'setIfNotExists',
          set: true
        });
        
        return true;
      }
      
      emitCacheEvent(CacheEventType.SET, { 
        key, 
        operation: 'setIfNotExists',
        set: false
      });
      
      return false;
    } catch (error) {
      handleCacheError(error, { 
        operation: 'setIfNotExists', 
        key 
      });
      return false;
    }
  }

  /**
   * Perform set operations on arrays
   * 
   * @param key - Cache key
   * @param operation - Set operation (union, intersection, difference)
   * @param items - Items for the operation
   * @param options - Cache options
   * @returns Result of the set operation
   */
  async setOperations<T>(
    key: string,
    operation: 'union' | 'intersection' | 'difference',
    items: T[],
    options?: CacheOptions
  ): Promise<T[]> {
    validateCacheKey(key);
    
    try {
      // Get the current value
      const current = await this.provider.get<T[]>(key);
      const currentArray = Array.isArray(current) ? current : [];
      
      let result: T[];
      
      switch (operation) {
        case 'union':
          // Combine arrays and remove duplicates
          result = [...new Set([...currentArray, ...items])];
          break;
          
        case 'intersection':
          // Keep only items that are in both arrays
          result = currentArray.filter(item => 
            items.some(i => JSON.stringify(i) === JSON.stringify(item))
          );
          break;
          
        case 'difference':
          // Keep only items that are in current but not in items
          result = currentArray.filter(item => 
            !items.some(i => JSON.stringify(i) === JSON.stringify(item))
          );
          break;
          
        default:
          throw new Error('Unknown set operation');
      }
      
      // Store back to cache
      await this.provider.set(key, result, options);
      
      emitCacheEvent(CacheEventType.SET, { 
        key, 
        operation: `setOperation:${operation}`,
        resultSize: result.length
      });
      
      return result;
    } catch (error) {
      handleCacheError(error, { 
        operation: `setOperation:${operation}`, 
        key 
      });
      throw error;
    }
  }

  /**
   * Batch get multiple keys
   * 
   * @param keys - Keys to get
   * @returns Object with values keyed by cache key
   */
  async batchGet<T>(keys: string[]): Promise<Record<string, T | null>> {
    try {
      // Use provider's getMany if available
      if (typeof (this.provider as any).getMany === 'function') {
        return await (this.provider as any).getMany<T>(keys);
      }
      
      // Fall back to individual gets
      const result: Record<string, T | null> = {};
      
      for (const key of keys) {
        result[key] = await this.provider.get<T>(key);
      }
      
      return result;
    } catch (error) {
      handleCacheError(error, { 
        operation: 'batchGet', 
        keys 
      });
      throw error;
    }
  }

  /**
   * Batch set multiple key-value pairs
   * 
   * @param entries - Key-value pairs to set
   * @param options - Cache options
   */
  async batchSet<T>(entries: Record<string, T>, options?: CacheOptions): Promise<void> {
    try {
      // Use provider's setMany if available
      if (typeof (this.provider as any).setMany === 'function') {
        await (this.provider as any).setMany<T>(entries, options);
        return;
      }
      
      // Fall back to individual sets
      for (const [key, value] of Object.entries(entries)) {
        await this.provider.set(key, value, options);
      }
    } catch (error) {
      handleCacheError(error, { 
        operation: 'batchSet', 
        keys: Object.keys(entries) 
      });
      throw error;
    }
  }

  /**
   * Execute a transaction of operations
   * 
   * @param operations - Operations to execute
   * @param options - Transaction options
   * @returns Results of operations that return values
   */
  async transaction(
    operations: Array<{
      type: 'get' | 'set' | 'delete' | 'has';
      key: string;
      value?: any;
      options?: CacheOptions;
    }>,
    options?: {
      atomic?: boolean;
    }
  ): Promise<any[]> {
    try {
      const results: any[] = [];
      
      for (const op of operations) {
        switch (op.type) {
          case 'get':
            results.push(await this.provider.get(op.key));
            break;
            
          case 'set':
            await this.provider.set(op.key, op.value, op.options);
            results.push(undefined);
            break;
            
          case 'delete':
            results.push(await this.provider.delete(op.key));
            break;
            
          case 'has':
            results.push(await this.provider.get(op.key) !== null);
            break;
            
          default:
            throw new Error('Unknown operation type');
        }
      }
      
      // Filter out undefined results (from set operations)
      return results.filter(r => r !== undefined);
    } catch (error) {
      handleCacheError(error, { 
        operation: 'transaction'
      });
      throw error;
    }
  }

  /**
   * Execute an atomic operation on a cache value
   * 
   * @param key - Cache key
   * @param operation - Operation to execute
   * @param options - Cache options
   * @returns Result of the operation
   */
  async atomic<T, R>(
    key: string,
    operation: (value: T | null) => R | Promise<R>,
    options?: CacheOptions
  ): Promise<R> {
    validateCacheKey(key);
    
    try {
      // Get current value
      const current = await this.provider.get<T>(key);
      
      // Execute operation
      const result = await operation(current);
      
      // If result is not undefined, store it back
      if (result !== undefined) {
        await this.provider.set(key, result as any, options);
      }
      
      return result;
    } catch (error) {
      handleCacheError(error, { 
        operation: 'atomic', 
        key 
      });
      throw error;
    }
  }
}