/**
 * @fileoverview Utilities for serializing and deserializing cache data
 */

import { CacheErrorCode, createCacheError } from './error-utils';

/**
 * Serialization options
 */
export interface SerializationOptions {
    /**
     * Whether to handle special types (Date, RegExp, etc.)
     */
    handleSpecialTypes?: boolean;
    
    /**
     * Whether to track circular references
     */
    circularReferences?: boolean;
    
    /**
     * Whether to throw on error (vs returning undefined)
     */
    throwOnError?: boolean;
    
    /**
     * Custom replacer function for JSON.stringify
     */
    replacer?: (key: string, value: any) => any;
    
    /**
     * Custom reviver function for JSON.parse
     */
    reviver?: (key: string, value: any) => any;
}

/**
 * Default serialization options
 */
const DEFAULT_OPTIONS: SerializationOptions = {
    handleSpecialTypes: true,
    circularReferences: true,
    throwOnError: false
};

// Type marker for special types
const TYPE_MARKER = '__type';
const VALUE_MARKER = '__value';

/**
 * Serialize a value to a string
 * 
 * @param value Value to serialize
 * @param options Serialization options
 * @returns Serialized value
 */
export function serialize(value: any, options: SerializationOptions = {}): string {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    try {
        // Handle undefined - convert to null for JSON compatibility
        if (value === undefined) {
            return 'null';
        }
        
        // Handle non-serializable types
        if (value instanceof Error) {
            return serializeSpecial('Error', {
                message: value.message,
                name: value.name,
                stack: value.stack
            }, opts);
        }
        
        // For other primitives and regular objects, use JSON.stringify
        return JSON.stringify(value, createReplacer(opts));
    } catch (error) {
        if (opts.throwOnError) {
            throw createCacheError(
                `Failed to serialize value: ${(error as Error).message}`,
                CacheErrorCode.SERIALIZATION_ERROR,
                error as Error
            );
        }
        
        return 'null';
    }
}

/**
 * Deserialize a string to a value
 * 
 * @param serialized Serialized string
 * @param options Serialization options
 * @returns Deserialized value
 */
export function deserialize(serialized: string, options: SerializationOptions = {}): any {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    
    try {
        if (!serialized || serialized === 'null') {
            return null;
        }
        
        return JSON.parse(serialized, createReviver(opts));
    } catch (error) {
        if (opts.throwOnError) {
            throw createCacheError(
                `Failed to deserialize value: ${(error as Error).message}`,
                CacheErrorCode.DESERIALIZATION_ERROR,
                error as Error
            );
        }
        
        return null;
    }
}

/**
 * Create a replacer function for JSON.stringify
 * 
 * @param options Serialization options
 * @returns Replacer function
 */
function createReplacer(options: SerializationOptions): (key: string, value: any) => any {
    // Keep track of objects we've seen (for circular reference detection)
    const seen = new WeakMap();
    
    return function(key: string, value: any): any {
        // Apply custom replacer if provided
        if (options.replacer) {
            value = options.replacer(key, value);
        }
        
        // Handle circular references
        if (options.circularReferences && typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return { [TYPE_MARKER]: 'circular', [VALUE_MARKER]: seen.get(value) };
            }
            seen.set(value, key || 'root');
        }
        
        // Handle special types if enabled
        if (options.handleSpecialTypes) {
            // Handle Date
            if (value instanceof Date) {
                return { [TYPE_MARKER]: 'date', [VALUE_MARKER]: value.toISOString() };
            }
            
            // Handle RegExp
            if (value instanceof RegExp) {
                return { 
                    [TYPE_MARKER]: 'regexp', 
                    [VALUE_MARKER]: {
                        source: value.source,
                        flags: value.flags
                    }
                };
            }
            
            // Handle Map
            if (value instanceof Map) {
                return { 
                    [TYPE_MARKER]: 'map', 
                    [VALUE_MARKER]: Array.from(value.entries())
                };
            }
            
            // Handle Set
            if (value instanceof Set) {
                return { 
                    [TYPE_MARKER]: 'set', 
                    [VALUE_MARKER]: Array.from(value) 
                };
            }
            
            // Handle typed arrays
            if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
                return { 
                    [TYPE_MARKER]: value.constructor.name, 
                    [VALUE_MARKER]: Array.from(new Uint8Array(value.buffer)) 
                };
            }
        }
        
        return value;
    };
}

/**
 * Create a reviver function for JSON.parse
 * 
 * @param options Serialization options
 * @returns Reviver function
 */
function createReviver(options: SerializationOptions): (key: string, value: any) => any {
    return function(key: string, value: any): any {
        // Apply custom reviver if provided
        if (options.reviver) {
            value = options.reviver(key, value);
        }
        
        // Handle special types if enabled
        if (options.handleSpecialTypes && 
            value !== null && 
            typeof value === 'object' && 
            TYPE_MARKER in value && 
            VALUE_MARKER in value) {
            
            const type = value[TYPE_MARKER];
            const val = value[VALUE_MARKER];
            
            switch (type) {
                case 'date':
                    return new Date(val);
                    
                case 'regexp': {
                    const { source, flags } = val;
                    return new RegExp(source, flags);
                }
                
                case 'map':
                    return new Map(val);
                    
                case 'set':
                    return new Set(val);
                    
                case 'Int8Array':
                    return new Int8Array(val);
                    
                case 'Uint8Array':
                    return new Uint8Array(val);
                    
                case 'Uint8ClampedArray':
                    return new Uint8ClampedArray(val);
                    
                case 'Int16Array':
                    return new Int16Array(val);
                    
                case 'Uint16Array':
                    return new Uint16Array(val);
                    
                case 'Int32Array':
                    return new Int32Array(val);
                    
                case 'Uint32Array':
                    return new Uint32Array(val);
                    
                case 'Float32Array':
                    return new Float32Array(val);
                    
                case 'Float64Array':
                    return new Float64Array(val);
                    
                case 'BigInt64Array':
                    return new BigInt64Array(val);
                    
                case 'BigUint64Array':
                    return new BigUint64Array(val);
                    
                case 'Error':
                    return Object.assign(new Error(val.message), val);
            }
        }
        
        return value;
    };
}

/**
 * Serialize a special type
 * 
 * @param type Type name
 * @param value Value
 * @param options Serialization options
 * @returns Serialized value
 */
function serializeSpecial(
    type: string, 
    value: any, 
    options: SerializationOptions
): string {
    const wrappedValue = { [TYPE_MARKER]: type, [VALUE_MARKER]: value };
    return JSON.stringify(wrappedValue, options.replacer);
}

/**
 * Helper function to detect circular references
 * 
 * @param obj Object to check
 * @returns Whether object contains circular references
 */
export function hasCircularReferences(obj: any): boolean {
    try {
        JSON.stringify(obj);
        return false;
    } catch (error) {
        return (error as Error).message.includes('circular');
    }
}