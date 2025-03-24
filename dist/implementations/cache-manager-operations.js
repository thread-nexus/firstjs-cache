"use strict";
/**
 * @fileoverview Advanced cache operations implementation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManagerOperations = void 0;
const cache_events_1 = require("../events/cache-events");
const error_utils_1 = require("../utils/error-utils");
const validation_utils_1 = require("../utils/validation-utils");
/**
 * Advanced cache operations implementation
 */
class CacheManagerOperations {
    /**
     * Create a new cache operations manager
     *
     * @param provider - Primary cache provider
     */
    constructor(provider) {
        this.provider = provider;
    }
    /**
     * Update specific fields in a cached object
     *
     * @param key - Cache key
     * @param fields - Fields to update
     * @param options - Cache options
     * @returns Updated object or false if operation failed
     */
    async updateFields(key, fields, options) {
        (0, validation_utils_1.validateCacheKey)(key);
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
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
                key,
                operation: 'updateFields',
                fieldsUpdated: Object.keys(fields)
            });
            return updated;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
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
    async arrayAppend(key, items, options) {
        (0, validation_utils_1.validateCacheKey)(key);
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
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
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
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
                key,
                operation: 'arrayAppend',
                itemsAppended: items.length
            });
            return updated;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
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
    async arrayRemove(key, predicate, options) {
        (0, validation_utils_1.validateCacheKey)(key);
        try {
            // Get the current value
            const current = await this.provider.get(key);
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
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
                key,
                operation: 'arrayRemove',
                itemsRemoved: removedCount
            });
            return updated;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
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
    async increment(key, increment = 1, options) {
        (0, validation_utils_1.validateCacheKey)(key);
        try {
            // Get the current value
            const current = await this.provider.get(key);
            // Calculate new value
            const newValue = typeof current === 'number' ? current + increment : increment;
            // Store back to cache
            await this.provider.set(key, newValue, options);
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
                key,
                operation: 'increment',
                increment,
                newValue
            });
            return newValue;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
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
    async decrement(key, decrement = 1, options) {
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
    async getAndSet(key, value, options) {
        (0, validation_utils_1.validateCacheKey)(key);
        try {
            // Get the current value
            const previous = await this.provider.get(key);
            // Set the new value
            await this.provider.set(key, value, options);
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
                key,
                operation: 'getAndSet'
            });
            return previous;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
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
    async setIfNotExists(key, value, options) {
        (0, validation_utils_1.validateCacheKey)(key);
        try {
            // Check if key exists
            const exists = await this.provider.get(key) !== null;
            if (!exists) {
                // Set the value
                await this.provider.set(key, value, options);
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
                    key,
                    operation: 'setIfNotExists',
                    set: true
                });
                return true;
            }
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
                key,
                operation: 'setIfNotExists',
                set: false
            });
            return false;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
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
    async setOperations(key, operation, items, options) {
        (0, validation_utils_1.validateCacheKey)(key);
        try {
            // Get the current value
            const current = await this.provider.get(key);
            const currentArray = Array.isArray(current) ? current : [];
            let result;
            switch (operation) {
                case 'union':
                    // Combine arrays and remove duplicates
                    result = [...new Set([...currentArray, ...items])];
                    break;
                case 'intersection':
                    // Keep only items that are in both arrays
                    result = currentArray.filter(item => items.some(i => JSON.stringify(i) === JSON.stringify(item)));
                    break;
                case 'difference':
                    // Keep only items that are in current but not in items
                    result = currentArray.filter(item => !items.some(i => JSON.stringify(i) === JSON.stringify(item)));
                    break;
                default:
                    throw new Error('Unknown set operation');
            }
            // Store back to cache
            await this.provider.set(key, result, options);
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
                key,
                operation: `setOperation:${operation}`,
                resultSize: result.length
            });
            return result;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
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
    async batchGet(keys) {
        try {
            // Safely check and call getMany
            if (this.provider && typeof this.provider.getMany === 'function') {
                return await this.provider.getMany(keys);
            }
            // Fall back to individual gets
            const result = {};
            for (const key of keys) {
                result[key] = await this.provider.get(key);
            }
            return result;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
                operation: 'getMany',
                key: keys.join(',')
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
    async batchSet(entries, options) {
        try {
            // Safely check and call setMany
            if (this.provider && typeof this.provider.setMany === 'function') {
                await this.provider.setMany(entries, options);
                return;
            }
            // Fall back to individual sets
            for (const [key, value] of Object.entries(entries)) {
                await this.provider.set(key, value, options);
            }
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
                operation: 'setMany',
                key: Object.keys(entries).join(',')
            });
            throw error;
        }
    }
    /**
     * Get multiple values from cache
     */
    async getMany(keys) {
        if (!this.provider || typeof this.provider.getMany !== 'function') {
            // Fallback implementation using get
            const result = {};
            for (const key of keys) {
                result[key] = await this.provider.get(key);
            }
            return result;
        }
        return await this.provider.getMany(keys);
    }
    /**
     * Set multiple values in cache
     */
    async setMany(entries, options) {
        if (!this.provider || typeof this.provider.setMany !== 'function') {
            // Fallback implementation using set
            for (const [key, value] of Object.entries(entries)) {
                await this.provider.set(key, value, options);
            }
            return;
        }
        await this.provider.setMany(entries, options);
    }
    /**
     * Execute a transaction of operations
     *
     * @param operations - Operations to execute
     * @param options - Transaction options
     * @returns Results of operations that return values
     */
    async transaction(operations, options) {
        try {
            const results = [];
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
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
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
    async atomic(key, operation, options) {
        (0, validation_utils_1.validateCacheKey)(key);
        try {
            // Get current value
            const current = await this.provider.get(key);
            // Execute operation
            const result = await operation(current);
            // If result is not undefined, store it back
            if (result !== undefined) {
                await this.provider.set(key, result, options);
            }
            return result;
        }
        catch (error) {
            (0, error_utils_1.handleCacheError)(error, {
                operation: 'atomic',
                key
            });
            throw error;
        }
    }
}
exports.CacheManagerOperations = CacheManagerOperations;
//# sourceMappingURL=cache-manager-operations.js.map