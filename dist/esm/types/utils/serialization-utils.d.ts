/**
 * @fileoverview Enhanced serialization utilities with compression and validation
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */
/**
 * Compression options
 */
export interface CompressionOptions {
    algorithm: 'gzip' | 'deflate';
    threshold?: number;
    level?: number;
    strategy?: number;
    dictionary?: Buffer;
}
/**
 * Enhanced serialization options
 */
export interface SerializationOptions {
    compression?: {
        enabled: boolean;
        threshold: number;
        algorithm: 'gzip' | 'brotli' | 'deflate';
    };
    validation?: {
        checksum: boolean;
        schema?: any;
    };
    encryption?: {
        enabled: boolean;
        algorithm: string;
        key: Buffer;
    };
    typeHandlers?: Map<string, TypeHandler>;
}
interface TypeHandler {
    serialize: (value: any) => string;
    deserialize: (value: string) => any;
}
/**
 * Enhanced serializer class
 */
export declare class Serializer {
    private options;
    private typeHandlers;
    constructor(options?: SerializationOptions);
    /**
     * Serialize data with enhanced features
     */
    serialize(data: any): Promise<SerializedData>;
    /**
     * Deserialize data with validation
     */
    deserialize<T>(serializedData: SerializedData): Promise<T>;
    private serializeWithTypes;
    private deserializeWithTypes;
    private getDefaultTypeHandlers;
    private shouldCompress;
    private calculateChecksum;
    private validateChecksum;
    private encrypt;
    private decrypt;
    private getValueType;
}
export interface SerializedData {
    data: string;
    metadata: {
        checksum?: string;
        isCompressed: boolean;
        timestamp: string;
        size: number;
        originalSize: number;
    };
}
export declare function serialize(data: any, options?: CompressionOptions): Promise<string>;
export declare function deserialize<T>(data: string, options?: CompressionOptions): Promise<T>;
export {};
