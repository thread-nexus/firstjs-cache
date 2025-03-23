"use strict";
/**
 * @fileoverview Advanced cache operations implementation with support for
 * atomic operations, batching, and complex caching patterns.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheManagerOperations = void 0;
const error_utils_1 = require("../utils/error-utils");
const cache_manager_utils_1 = require("./cache-manager-utils");
const default_config_1 = require("../config/default-config");
/**
 * Lock manager for atomic operations
 */
class LockManager {
    constructor() {
        this.locks = new Map();
        this.lockTimeouts = new Map();
    }
    acquireLock(key_1) {
        return __awaiter(this, arguments, void 0, function* (key, timeout = 5000) {
            if (this.locks.has(key)) {
                return false;
            }
            const release = new Promise(resolve => {
                const timeoutId = setTimeout(() => {
                    this.releaseLock(key);
                    resolve();
                }, timeout);
                this.lockTimeouts.set(key, timeoutId);
            });
            this.locks.set(key, release);
            return true;
        });
    }
    releaseLock(key) {
        const timeout = this.lockTimeouts.get(key);
        if (timeout) {
            clearTimeout(timeout);
            this.lockTimeouts.delete(key);
        }
        this.locks.delete(key);
    }
}
class CacheManagerOperations {
    constructor(provider) {
        this.provider = provider;
        this.lockManager = new LockManager();
    }
    /**
     * Perform an atomic operation on a cache entry
     */
    atomic(key, operation, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const timeout = (options === null || options === void 0 ? void 0 : options.timeout) || 5000;
            if (!(yield this.lockManager.acquireLock(key, timeout))) {
                throw new Error('Failed to acquire lock');
            }
            try {
                const currentValue = yield this.provider.get(key);
                const newValue = yield operation(currentValue);
                yield this.provider.set(key, newValue, options);
                return newValue;
            }
            finally {
                this.lockManager.releaseLock(key);
            }
        });
    }
    /**
     * Increment a numeric cache value
     */
    increment(key_1) {
        return __awaiter(this, arguments, void 0, function* (key, amount = 1, options) {
            return this.atomic(key, (current) => __awaiter(this, void 0, void 0, function* () { return (current || 0) + amount; }), options);
        });
    }
    /**
     * Decrement a numeric cache value
     */
    decrement(key_1) {
        return __awaiter(this, arguments, void 0, function* (key, amount = 1, options) {
            return this.atomic(key, (current) => __awaiter(this, void 0, void 0, function* () { return (current || 0) - amount; }), options);
        });
    }
    /**
     * Update specific fields in an object
     */
    updateFields(key, updates, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.atomic(key, (current) => __awaiter(this, void 0, void 0, function* () {
                return (Object.assign(Object.assign({}, (current || {})), updates));
            }), options);
        });
    }
    /**
     * Append to an array in cache
     */
    arrayAppend(key, items, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const maxLength = (options === null || options === void 0 ? void 0 : options.maxLength) || Infinity;
            return this.atomic(key, (current) => __awaiter(this, void 0, void 0, function* () {
                const array = [...(current || []), ...items];
                return array.slice(-maxLength);
            }), options);
        });
    }
    /**
     * Remove items from an array in cache
     */
    arrayRemove(key, predicate, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.atomic(key, (current) => __awaiter(this, void 0, void 0, function* () { return current ? current.filter(item => !predicate(item)) : []; }), options);
        });
    }
    /**
     * Perform set operations
     */
    setOperations(key, operation, items, options) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.atomic(key, (current) => __awaiter(this, void 0, void 0, function* () {
                const currentSet = new Set(current || []);
                const itemsSet = new Set(items);
                switch (operation) {
                    case 'union':
                        return [...new Set([...currentSet, ...itemsSet])];
                    case 'intersection':
                        return [...new Set([...currentSet].filter(x => itemsSet.has(x)))];
                    case 'difference':
                        return [...new Set([...currentSet].filter(x => !itemsSet.has(x)))];
                    default:
                        throw new Error('Invalid set operation');
                }
            }), options);
        });
    }
    /**
     * Batch get operation with automatic retry
     */
    batchGet(keys, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = {};
            const batchSize = (options === null || options === void 0 ? void 0 : options.batchSize) || default_config_1.CACHE_CONSTANTS.DEFAULT_BATCH_SIZE;
            const retries = (options === null || options === void 0 ? void 0 : options.retries) || 3;
            yield (0, cache_manager_utils_1.batchOperations)(keys, (key) => __awaiter(this, void 0, void 0, function* () {
                for (let attempt = 0; attempt < retries; attempt++) {
                    try {
                        results[key] = yield this.provider.get(key);
                        break;
                    }
                    catch (error) {
                        if (attempt === retries - 1)
                            throw error;
                        yield new Promise(resolve => setTimeout(resolve, 2 ** attempt * 100));
                    }
                }
            }), {
                batchSize,
                onProgress: options === null || options === void 0 ? void 0 : options.onProgress
            });
            return results;
        });
    }
    /**
     * Batch set operation with automatic retry
     */
    batchSet(entries, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const keys = Object.keys(entries);
            const batchSize = (options === null || options === void 0 ? void 0 : options.batchSize) || default_config_1.CACHE_CONSTANTS.DEFAULT_BATCH_SIZE;
            const retries = (options === null || options === void 0 ? void 0 : options.retries) || 3;
            yield (0, cache_manager_utils_1.batchOperations)(keys, (key) => __awaiter(this, void 0, void 0, function* () {
                for (let attempt = 0; attempt < retries; attempt++) {
                    try {
                        yield this.provider.set(key, entries[key], options);
                        break;
                    }
                    catch (error) {
                        if (attempt === retries - 1)
                            throw error;
                        yield new Promise(resolve => setTimeout(resolve, 2 ** attempt * 100));
                    }
                }
            }), {
                batchSize,
                onProgress: options === null || options === void 0 ? void 0 : options.onProgress
            });
        });
    }
    /**
     * Execute a transaction-like sequence of operations
     */
    transaction(operations, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (options === null || options === void 0 ? void 0 : options.atomic) {
                const keys = operations.map(op => op.key);
                const lockPromises = keys.map(key => this.lockManager.acquireLock(key));
                const acquired = yield Promise.all(lockPromises);
                if (!acquired.every(Boolean)) {
                    throw new Error('Failed to acquire all locks');
                }
                try {
                    return yield this.executeOperations(operations);
                }
                finally {
                    keys.forEach(key => this.lockManager.releaseLock(key));
                }
            }
            else {
                return this.executeOperations(operations);
            }
        });
    }
    executeOperations(operations) {
        return __awaiter(this, void 0, void 0, function* () {
            const results = [];
            for (const op of operations) {
                try {
                    switch (op.type) {
                        case 'get':
                            results.push(yield this.provider.get(op.key));
                            break;
                        case 'set':
                            yield this.provider.set(op.key, op.value, op.options);
                            break;
                        case 'delete':
                            yield this.provider.delete(op.key);
                            break;
                    }
                }
                catch (error) {
                    (0, error_utils_1.handleCacheError)(error, {
                        operation: op.type,
                        key: op.key
                    });
                    throw error;
                }
            }
            return results;
        });
    }
}
exports.CacheManagerOperations = CacheManagerOperations;
