"use strict";
/**
 * @fileoverview High-performance serialization utilities for cache operations
 * with optimizations for common data types and structures.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.serializeData = serializeData;
exports.deserializeData = deserializeData;
exports.createSerializer = createSerializer;
const cache_events_1 = require("../events/cache-events");
// Optimization: Pre-compile type checks
const toString = Object.prototype.toString;
const isArray = Array.isArray;
const isBuffer = typeof Buffer !== 'undefined'
    ? (obj) => Buffer.isBuffer(obj)
    : () => false;
/**
 * Type-specific serializers for optimal performance
 * @internal
 */
const TYPE_SERIALIZERS = new Map([
    ['[object Date]', (v) => ['__date__', v.toISOString()]],
    ['[object RegExp]', (v) => ['__regexp__', v.toString()]],
    ['[object Error]', (v) => ['__error__', { message: v.message, stack: v.stack }]],
    ['[object Set]', (v) => ['__set__', Array.from(v)]],
    ['[object Map]', (v) => ['__map__', Array.from(v)]],
    ['[object ArrayBuffer]', (v) => ['__arraybuffer__', Array.from(new Uint8Array(v))]]
]);
/**
 * Type-specific deserializers for optimal performance
 * @internal
 */
const TYPE_DESERIALIZERS = new Map([
    ['__date__', (v) => new Date(v)],
    ['__regexp__', (v) => {
            const match = /^\/(.+)\/([gimuy]*)$/.exec(v);
            return match ? new RegExp(match[1], match[2] || '') : new RegExp(v || '');
        }],
    ['__error__', (v) => {
            const err = new Error(v.message);
            err.stack = v.stack;
            return err;
        }],
    ['__set__', (v) => new Set(v)],
    ['__map__', (v) => new Map(v)],
    ['__arraybuffer__', (v) => new Uint8Array(v).buffer]
]);
/**
 * Serialize data with type preservation and optimization
 *
 * @param data - Data to serialize
 * @returns Serialized string
 *
 * @complexity Time: O(n) where n is the size of the data structure
 * @category Serialization
 * @priority Critical
 *
 * @example
 * ```typescript
 * const serialized = serializeData({
 *   date: new Date(),
 *   set: new Set([1, 2, 3])
 * });
 * ```
 */
function serializeData(data) {
    const startTime = performance.now();
    try {
        const serialized = JSON.stringify(data, (key, value) => {
            if (value === undefined)
                return '__undefined__';
            if (value === Infinity)
                return '__infinity__';
            if (Number.isNaN(value))
                return '__nan__';
            if (value !== null && typeof value === 'object') {
                const type = toString.call(value);
                const serializer = TYPE_SERIALIZERS.get(type);
                if (serializer) {
                    return serializer(value);
                }
            }
            return value;
        });
        const duration = performance.now() - startTime;
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
            message: 'Serialization complete',
            duration,
            size: serialized.length
        });
        return serialized;
    }
    catch (error) {
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.ERROR, {
            error,
            message: 'Serialization failed'
        });
        throw error;
    }
}
/**
 * Deserialize data with type restoration and validation
 *
 * @param str - Serialized string to deserialize
 * @returns Deserialized data
 *
 * @complexity Time: O(n) where n is the size of the serialized string
 * @category Serialization
 * @priority Critical
 *
 * @example
 * ```typescript
 * const data = deserializeData<{ date: Date; set: Set<number> }>(serialized);
 * console.log(data.date instanceof Date); // true
 * ```
 */
function deserializeData(str) {
    const startTime = performance.now();
    try {
        const deserialized = JSON.parse(str, (key, value) => {
            if (value === '__undefined__')
                return undefined;
            if (value === '__infinity__')
                return Infinity;
            if (value === '__nan__')
                return NaN;
            if (value !== null && typeof value === 'object') {
                const type = Object.keys(value)[0];
                if (type) {
                    const deserializer = TYPE_DESERIALIZERS.get(type);
                    if (deserializer) {
                        return deserializer(value[type]);
                    }
                }
            }
            return value;
        });
        const duration = performance.now() - startTime;
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.GET, {
            message: 'Deserialization complete',
            duration
        });
        return deserialized;
    }
    catch (error) {
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.ERROR, {
            error,
            message: 'Deserialization failed'
        });
        throw error;
    }
}
/**
 * Create a custom serializer with specific type handlers
 *
 * @param options - Serializer configuration options
 * @returns Custom serializer object
 *
 * @example
 * ```typescript
 * const serializer = createSerializer({
 *   typeHandlers: {
 *     BigInt: {
 *       serialize: (v) => v.toString(),
 *       deserialize: (v) => BigInt(v)
 *     }
 *   }
 * });
 * ```
 */
function createSerializer(options) {
    const customSerializers = new Map(TYPE_SERIALIZERS);
    const customDeserializers = new Map(TYPE_DESERIALIZERS);
    if (options.typeHandlers) {
        for (const [type, handler] of Object.entries(options.typeHandlers)) {
            const typeKey = `__${type.toLowerCase()}__`;
            customSerializers.set(type, (v) => [typeKey, handler.serialize(v)]);
            customDeserializers.set(typeKey, handler.deserialize);
        }
    }
    return {
        serialize: (data) => serializeWithCustomHandlers(data, customSerializers),
        deserialize: (str) => deserializeWithCustomHandlers(str, customDeserializers)
    };
}
/**
 * Internal helper for custom serialization
 * @internal
 */
function serializeWithCustomHandlers(data, handlers) {
    return JSON.stringify(data, (key, value) => {
        if (value === undefined)
            return '__undefined__';
        if (value === Infinity)
            return '__infinity__';
        if (Number.isNaN(value))
            return '__nan__';
        if (value !== null && typeof value === 'object') {
            const type = toString.call(value);
            const handler = handlers.get(type);
            if (handler) {
                return handler(value);
            }
        }
        return value;
    });
}
/**
 * Internal helper for custom deserialization
 * @internal
 */
function deserializeWithCustomHandlers(str, handlers) {
    return JSON.parse(str, (key, value) => {
        if (value === '__undefined__')
            return undefined;
        if (value === '__infinity__')
            return Infinity;
        if (value === '__nan__')
            return NaN;
        if (value !== null && typeof value === 'object') {
            const type = Object.keys(value)[0];
            const handler = handlers.get(type);
            if (handler) {
                return handler(value[type]);
            }
        }
        return value;
    });
}
// Documentation metadata
exports.metadata = {
    category: "Serialization" /* DocCategory.SERIALIZATION */,
    priority: 1 /* DocPriority.CRITICAL */,
    complexity: {
        time: 'O(n) for both serialization and deserialization',
        space: 'O(n) for temporary storage during conversion',
        impact: "high" /* PerformanceImpact.HIGH */,
        notes: 'Optimized for common data types and structures'
    },
    examples: [{
            title: 'Basic Serialization',
            code: `
      const data = {
        date: new Date(),
        set: new Set([1, 2, 3]),
        map: new Map([['key', 'value']])
      };
      const serialized = serializeData(data);
      const deserialized = deserializeData(serialized);
    `,
            description: 'Serialize and deserialize complex data structures'
        }],
    since: '1.0.0'
};
