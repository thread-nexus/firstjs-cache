/**
 * Serialization utilities for cache operations
 */

import {CacheError, CacheErrorCode} from './error-utils';

/**
 * Serialize a value to string
 *
 * @param value - Value to serialize
 * @returns Serialized value
 */
export function serialize(value: any): string {
    try {
        // Handle special cases
        if (value === undefined) {
            return '__undefined__';
        }

        if (value === null) {
            return '__null__';
        }

        if (typeof value === 'function') {
            return '__function__';
        }

        // Handle Date objects
        if (value instanceof Date) {
            return `__date__:${value.toISOString()}`;
        }

        // Handle RegExp objects
        if (value instanceof RegExp) {
            return `__regexp__:${value.toString()}`;
        }

        // Handle Buffer objects
        if (Buffer.isBuffer(value)) {
            return `__buffer__:${value.toString('base64')}`;
        }

        // Handle Set objects
        if (value instanceof Set) {
            return `__set__:${JSON.stringify(Array.from(value))}`;
        }

        // Handle Map objects
        if (value instanceof Map) {
            return `__map__:${JSON.stringify(Array.from(value.entries()))}`;
        }

        // Handle Error objects
        if (value instanceof Error) {
            return `__error__:${JSON.stringify({
                name: value.name,
                message: value.message,
                stack: value.stack
            })}`;
        }

        // Handle ArrayBuffer objects
        if (value instanceof ArrayBuffer) {
            return `__arraybuffer__:${Buffer.from(value).toString('base64')}`;
        }

        // Handle TypedArray objects
        if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
            const typedArray = value as TypedArray;
            return `__typedarray__:${typedArray.constructor.name}:${Buffer.from(typedArray.buffer).toString('base64')}`;
        }

        // Handle BigInt objects
        if (typeof value === 'bigint') {
            return `__bigint__:${value.toString()}`;
        }

        // Handle circular references
        const seen = new WeakSet();
        return JSON.stringify(value, (key, value) => {
            if (typeof value === 'object' && value !== null) {
                if (seen.has(value)) {
                    return '[Circular]';
                }
                seen.add(value);
            }
            return value;
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new CacheError(
            `Serialization failed: ${errorMessage}`,
            CacheErrorCode.SERIALIZATION_ERROR,
            error instanceof Error ? error : undefined
        );
    }
}

/**
 * Deserialize a value from string
 *
 * @param value - Serialized value
 * @returns Deserialized value
 */
export function deserialize(value: string): any {
    try {
        // Handle special cases
        if (value === '__undefined__') {
            return undefined;
        }

        if (value === '__null__') {
            return null;
        }

        if (value === '__function__') {
            return function () {
            };
        }

        // Handle Date objects
        if (value.startsWith('__date__:')) {
            return new Date(value.substring(9));
        }

        // Handle RegExp objects
        if (value.startsWith('__regexp__:')) {
            const regexStr = value.substring(11);
            const lastSlashIndex = regexStr.lastIndexOf('/');
            const pattern = regexStr.substring(1, lastSlashIndex);
            const flags = regexStr.substring(lastSlashIndex + 1);
            return new RegExp(pattern, flags);
        }

        // Handle Buffer objects
        if (value.startsWith('__buffer__:')) {
            return Buffer.from(value.substring(11), 'base64');
        }

        // Handle Set objects
        if (value.startsWith('__set__:')) {
            return new Set(JSON.parse(value.substring(8)));
        }

        // Handle Map objects
        if (value.startsWith('__map__:')) {
            return new Map(JSON.parse(value.substring(8)));
        }

        // Handle Error objects
        if (value.startsWith('__error__:')) {
            const errorData = JSON.parse(value.substring(10));
            const error = new Error(errorData.message);
            error.name = errorData.name;
            error.stack = errorData.stack;
            return error;
        }

        // Handle ArrayBuffer objects
        if (value.startsWith('__arraybuffer__:')) {
            const buffer = Buffer.from(value.substring(15), 'base64');
            return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        }

        // Handle TypedArray objects
        if (value.startsWith('__typedarray__:')) {
            const parts = value.split(':');
            const typeName = parts[1];
            const base64Data = parts.slice(2).join(':');
            const buffer = Buffer.from(base64Data, 'base64');
            const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

            switch (typeName) {
                case 'Int8Array':
                    return new Int8Array(arrayBuffer);
                case 'Uint8Array':
                    return new Uint8Array(arrayBuffer);
                case 'Uint8ClampedArray':
                    return new Uint8ClampedArray(arrayBuffer);
                case 'Int16Array':
                    return new Int16Array(arrayBuffer);
                case 'Uint16Array':
                    return new Uint16Array(arrayBuffer);
                case 'Int32Array':
                    return new Int32Array(arrayBuffer);
                case 'Uint32Array':
                    return new Uint32Array(arrayBuffer);
                case 'Float32Array':
                    return new Float32Array(arrayBuffer);
                case 'Float64Array':
                    return new Float64Array(arrayBuffer);
                case 'BigInt64Array':
                    return new BigInt64Array(arrayBuffer);
                case 'BigUint64Array':
                    return new BigUint64Array(arrayBuffer);
                default:
                    return new Uint8Array(arrayBuffer);
            }
        }

        // Handle BigInt objects
        if (value.startsWith('__bigint__:')) {
            return BigInt(value.substring(11));
        }

        // Handle normal JSON
        return JSON.parse(value);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new CacheError(
            `Deserialization failed: ${errorMessage}`,
            CacheErrorCode.DESERIALIZATION_ERROR,
            error instanceof Error ? error : undefined
        );
    }
}

/**
 * Verify data integrity using a hash
 *
 * @param data - Data to verify
 * @param hash - Hash to compare against
 * @returns Whether the data is valid
 */
export function verifyDataIntegrity(data: string, hash: string): boolean {
    try {
        // Calculate hash
        const calculatedHash = calculateHash(data);

        // Compare hashes
        return calculatedHash === hash;
    } catch (error) {
        throw new CacheError(
            'Data integrity check failed',
            CacheErrorCode.DATA_INTEGRITY_ERROR,
            error instanceof Error ? error : undefined
        );
    }
}

/**
 * Calculate a hash for data
 *
 * @param data - Data to hash
 * @returns Hash
 */
export function calculateHash(data: string): string {
    try {
        // Use crypto if available
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(data).digest('hex');
    } catch (error) {
        // Fallback to simple hash
        return simpleHash(data);
    }
}

/**
 * Simple hash function
 *
 * @param data - Data to hash
 * @returns Hash
 */
function simpleHash(data: string): string {
    let hash = 0;

    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return hash.toString(16);
}

// TypedArray type
type TypedArray =
    | Int8Array
    | Uint8Array
    | Uint8ClampedArray
    | Int16Array
    | Uint16Array
    | Int32Array
    | Uint32Array
    | Float32Array
    | Float64Array
    | BigInt64Array
    | BigUint64Array;