/**
 * @fileoverview Enhanced serialization utilities with compression and validation
 * @author harborgrid-justin
 * @lastModified 2025-03-24
 */

import { createHash } from 'crypto';
import { compress, decompress } from './compression-utils';
import { CacheError, CacheErrorCode } from './error-utils';

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
export class Serializer {
  private options: SerializationOptions;
  private typeHandlers: Map<string, TypeHandler>;

  constructor(options: SerializationOptions = {}) {
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
  public async serialize(data: any): Promise<SerializedData> {
    try {
      const serialized = this.serializeWithTypes(data);
      const checksum = this.options.validation?.checksum 
        ? this.calculateChecksum(serialized)
        : undefined;

      let finalData: string = serialized;
      let isCompressed = false;

      if (this.shouldCompress(serialized)) {
        const compressedBuffer = await compress(
          serialized,
          this.options.compression?.algorithm || 'gzip'
        );
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new CacheError(
        CacheErrorCode.SERIALIZATION_ERROR,
        `Serialization failed: ${errorMessage}`
      );
    }
  }

  /**
   * Deserialize data with validation
   */
  public async deserialize<T>(serializedData: SerializedData): Promise<T> {
    try {
      let { data, metadata } = serializedData;

      if (metadata.checksum) {
        this.validateChecksum(data, metadata.checksum);
      }

      if (this.options.encryption?.enabled) {
        data = this.decrypt(data);
      }

      let decodedData: string = data;
      if (metadata.isCompressed && this.options.compression?.algorithm) {
        const decompressedBuffer = await decompress(
          Buffer.from(data, 'base64'), 
          this.options.compression.algorithm
        );
        decodedData = decompressedBuffer.toString();
      }

      return this.deserializeWithTypes(decodedData);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new CacheError(
        CacheErrorCode.DESERIALIZATION_ERROR,
        `Deserialization failed: ${errorMessage}`
      );
    }
  }

  private serializeWithTypes(data: any): string {
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

  private deserializeWithTypes(data: string): any {
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

  private getDefaultTypeHandlers(): Map<string, TypeHandler> {
    const handlers = new Map<string, TypeHandler>();

    handlers.set('Map', {
      serialize: (v: Map<any, any>) => JSON.stringify([...v.entries()]),
      deserialize: (v: string) => new Map(JSON.parse(v))
    });

    handlers.set('Set', {
      serialize: (v: Set<any>) => JSON.stringify([...v]),
      deserialize: (v: string) => new Set(JSON.parse(v))
    });

    return handlers;
  }

  private shouldCompress(data: string): boolean {
    return !!this.options.compression?.enabled &&
           Buffer.byteLength(data) >= (this.options.compression?.threshold || 1024);
  }

  private calculateChecksum(data: string): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private validateChecksum(data: string, expectedChecksum: string): void {
    const actualChecksum = this.calculateChecksum(data);
    if (actualChecksum !== expectedChecksum) {
      throw new CacheError(
        CacheErrorCode.DATA_INTEGRITY_ERROR,
        'Data integrity check failed'
      );
    }
  }

  private encrypt(data: string): string {
    // Implement encryption logic here
    return data;
  }

  private decrypt(data: string): string {
    // Implement decryption logic here
    return data;
  }

  private getValueType(value: any): string | null {
    if (value instanceof Date) return 'Date';
    if (typeof value === 'bigint') return 'BigInt';
    if (value instanceof Map) return 'Map';
    if (value instanceof Set) return 'Set';
    return null;
  }
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

export async function serialize(data: any, options?: CompressionOptions): Promise<string> {
  const stringData = typeof data === 'string' ? data : JSON.stringify(data);
  
  if (!options?.algorithm) return stringData;
  
  const compressed = await compress(Buffer.from(stringData), options.algorithm);
  return compressed.toString('base64');
}

export async function deserialize<T>(data: string, options?: CompressionOptions): Promise<T> {
  if (!options?.algorithm) {
    return JSON.parse(data);
  }

  const buffer = Buffer.from(data, 'base64');
  const decompressed = await decompress(buffer, options.algorithm);
  return JSON.parse(decompressed.toString());
}