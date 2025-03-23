"use strict";
/**
 * @fileoverview Redis storage adapter implementation with connection pooling
 * and optimized batch operations.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.RedisAdapter = void 0;
const cache_events_1 = require("../events/cache-events");
const error_utils_1 = require("../utils/error-utils");
class RedisAdapter {
    constructor(config) {
        this.isConnected = false;
        this.prefix = config.prefix || '';
        this.connectionPromise = this.connect(config.redis);
    }
    /**
     * Connect to Redis
     */
    connect(config) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Dynamic import to avoid requiring redis as a direct dependency
                const { createClient } = yield Promise.resolve().then(() => __importStar(require('redis')));
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
                yield this.client.connect();
                this.isConnected = true;
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.PROVIDER_INITIALIZED, {
                    provider: 'redis',
                    host: config.host,
                    port: config.port
                });
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'connect',
                    provider: 'redis'
                });
                throw error;
            }
        });
    }
    /**
     * Ensure connection is established
     */
    ensureConnection() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isConnected) {
                yield this.connectionPromise;
            }
        });
    }
    /**
     * Get value from Redis
     */
    get(key) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureConnection();
            const prefixedKey = this.getKeyWithPrefix(key);
            try {
                const value = yield this.client.get(prefixedKey);
                (0, cache_events_1.emitCacheEvent)(value !== null ? cache_events_1.CacheEventType.GET_HIT : cache_events_1.CacheEventType.GET_MISS, { key, provider: 'redis' });
                return value;
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'get',
                    key,
                    provider: 'redis'
                });
                throw error;
            }
        });
    }
    /**
     * Set value in Redis
     */
    set(key, value, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureConnection();
            const prefixedKey = this.getKeyWithPrefix(key);
            try {
                yield this.client.set(prefixedKey, value, ttl ? { EX: ttl } : undefined);
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
                    key,
                    provider: 'redis',
                    ttl
                });
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'set',
                    key,
                    provider: 'redis'
                });
                throw error;
            }
        });
    }
    /**
     * Check if key exists in Redis
     */
    has(key) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureConnection();
            const prefixedKey = this.getKeyWithPrefix(key);
            try {
                const exists = yield this.client.exists(prefixedKey);
                return exists === 1;
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'has',
                    key,
                    provider: 'redis'
                });
                throw error;
            }
        });
    }
    /**
     * Delete value from Redis
     */
    delete(key) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureConnection();
            const prefixedKey = this.getKeyWithPrefix(key);
            try {
                const deleted = yield this.client.del(prefixedKey);
                if (deleted > 0) {
                    (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.DELETE, {
                        key,
                        provider: 'redis'
                    });
                }
                return deleted > 0;
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'delete',
                    key,
                    provider: 'redis'
                });
                throw error;
            }
        });
    }
    /**
     * Clear all values with prefix
     */
    clear() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureConnection();
            try {
                const pattern = this.prefix ? `${this.prefix}:*` : '*';
                let cursor = 0;
                do {
                    const [nextCursor, keys] = yield this.client.scan(cursor, {
                        MATCH: pattern,
                        COUNT: 100
                    });
                    if (keys.length > 0) {
                        yield this.client.del(keys);
                    }
                    cursor = parseInt(nextCursor);
                } while (cursor !== 0);
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.CLEAR, {
                    provider: 'redis'
                });
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'clear',
                    provider: 'redis'
                });
                throw error;
            }
        });
    }
    /**
     * Get matching keys from Redis
     */
    keys(pattern) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureConnection();
            const prefixedPattern = pattern
                ? this.getKeyWithPrefix(pattern.replace('*', '\\*'))
                : (this.prefix ? `${this.prefix}:*` : '*');
            try {
                const keys = yield this.client.keys(prefixedPattern);
                return keys.map(key => this.removePrefix(key));
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'keys',
                    pattern,
                    provider: 'redis'
                });
                throw error;
            }
        });
    }
    /**
     * Get multiple values from Redis
     */
    getMany(keys) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureConnection();
            const prefixedKeys = keys.map(key => this.getKeyWithPrefix(key));
            try {
                const values = yield this.client.mget(prefixedKeys);
                const result = {};
                keys.forEach((key, index) => {
                    result[key] = values[index];
                });
                return result;
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'getMany',
                    keys,
                    provider: 'redis'
                });
                throw error;
            }
        });
    }
    /**
     * Set multiple values in Redis
     */
    setMany(entries, ttl) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.ensureConnection();
            const prefixedEntries = Object.entries(entries).map(([key, value]) => [this.getKeyWithPrefix(key), value]);
            try {
                yield this.client.mset(prefixedEntries);
                if (ttl) {
                    yield Promise.all(prefixedEntries.map(([key]) => this.client.expire(key, ttl)));
                }
                (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
                    provider: 'redis',
                    batchSize: prefixedEntries.length,
                    ttl
                });
            }
            catch (error) {
                (0, error_utils_1.handleCacheError)(error, {
                    operation: 'setMany',
                    entries: Object.keys(entries),
                    provider: 'redis'
                });
                throw error;
            }
        });
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
    dispose() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isConnected) {
                yield this.client.quit();
                this.isConnected = false;
            }
        });
    }
}
exports.RedisAdapter = RedisAdapter;
