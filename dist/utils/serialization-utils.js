"use strict";
/**
 * @fileoverview Enhanced serialization utilities with compression and validation
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Serializer = void 0;
exports.serialize = serialize;
exports.deserialize = deserialize;
const crypto_1 = require("crypto");
const compression_utils_1 = require("./compression-utils");
const error_utils_1 = require("./error-utils");
/**
 * Enhanced serializer class
 */
class Serializer {
    constructor(options = {}) {
        this.options = {
            compression: {
                enabled: true,
                threshold: 1024,
                algorithm: 'gzip'
            },
            validation: {
                checksum: true
            },
            ...options
        };
        this.typeHandlers = this.getDefaultTypeHandlers();
        if (options.typeHandlers) {
            for (const [key, handler] of options.typeHandlers) {
                this.typeHandlers.set(key, handler);
            }
        }
    }
    /**
     * Serialize data with enhanced features
     */
    async serialize(data) {
        try {
            const serialized = this.serializeWithTypes(data);
            const checksum = this.options.validation?.checksum
                ? this.calculateChecksum(serialized)
                : undefined;
            let finalData = serialized;
            let isCompressed = false;
            if (this.shouldCompress(serialized)) {
                const compressedBuffer = await (0, compression_utils_1.compress)(serialized, this.options.compression?.algorithm || 'gzip');
                finalData = compressedBuffer.toString('base64');
                isCompressed = true;
            }
            if (this.options.encryption?.enabled) {
                finalData = this.encrypt(finalData);
            }
            return {
                data: finalData,
                metadata: {
                    checksum,
                    isCompressed,
                    timestamp: new Date().toISOString(),
                    size: Buffer.byteLength(finalData),
                    originalSize: Buffer.byteLength(serialized)
                }
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.SERIALIZATION_ERROR, `Serialization failed: ${errorMessage}`);
        }
    }
    /**
     * Deserialize data with validation
     */
    async deserialize(serializedData) {
        try {
            let { data, metadata } = serializedData;
            if (metadata.checksum) {
                this.validateChecksum(data, metadata.checksum);
            }
            if (this.options.encryption?.enabled) {
                data = this.decrypt(data);
            }
            let decodedData = data;
            if (metadata.isCompressed && this.options.compression?.algorithm) {
                const decompressedBuffer = await (0, compression_utils_1.decompress)(Buffer.from(data, 'base64'), this.options.compression.algorithm);
                decodedData = decompressedBuffer.toString();
            }
            return this.deserializeWithTypes(decodedData);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.DESERIALIZATION_ERROR, `Deserialization failed: ${errorMessage}`);
        }
    }
    serializeWithTypes(data) {
        return JSON.stringify(data, (key, value) => {
            const type = this.getValueType(value);
            if (type && this.typeHandlers.has(type)) {
                const handler = this.typeHandlers.get(type);
                if (handler) {
                    return {
                        __type: type,
                        value: handler.serialize(value)
                    };
                }
            }
            return value;
        });
    }
    deserializeWithTypes(data) {
        return JSON.parse(data, (key, value) => {
            if (value && typeof value === 'object' && value.__type) {
                const handler = this.typeHandlers.get(value.__type);
                if (handler) {
                    return handler.deserialize(value.value);
                }
            }
            return value;
        });
    }
    getDefaultTypeHandlers() {
        const handlers = new Map();
        handlers.set('Map', {
            serialize: (v) => JSON.stringify([...v.entries()]),
            deserialize: (v) => new Map(JSON.parse(v))
        });
        handlers.set('Set', {
            serialize: (v) => JSON.stringify([...v]),
            deserialize: (v) => new Set(JSON.parse(v))
        });
        return handlers;
    }
    shouldCompress(data) {
        return !!this.options.compression?.enabled &&
            Buffer.byteLength(data) >= (this.options.compression?.threshold || 1024);
    }
    calculateChecksum(data) {
        return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
    }
    validateChecksum(data, expectedChecksum) {
        const actualChecksum = this.calculateChecksum(data);
        if (actualChecksum !== expectedChecksum) {
            throw new error_utils_1.CacheError(error_utils_1.CacheErrorCode.DATA_INTEGRITY_ERROR, 'Data integrity check failed');
        }
    }
    encrypt(data) {
        // Implement encryption logic here
        return data;
    }
    decrypt(data) {
        // Implement decryption logic here
        return data;
    }
    getValueType(value) {
        if (value instanceof Date)
            return 'Date';
        if (typeof value === 'bigint')
            return 'BigInt';
        if (value instanceof Map)
            return 'Map';
        if (value instanceof Set)
            return 'Set';
        return null;
    }
}
exports.Serializer = Serializer;
async function serialize(data, options) {
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    if (!options?.algorithm)
        return stringData;
    const compressed = await (0, compression_utils_1.compress)(Buffer.from(stringData), options.algorithm);
    return compressed.toString('base64');
}
async function deserialize(data, options) {
    if (!options?.algorithm) {
        return JSON.parse(data);
    }
    const buffer = Buffer.from(data, 'base64');
    const decompressed = await (0, compression_utils_1.decompress)(buffer, options.algorithm);
    return JSON.parse(decompressed.toString());
}
//# sourceMappingURL=serialization-utils.js.map