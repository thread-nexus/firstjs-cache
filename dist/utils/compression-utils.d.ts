/**
 * Compression utilities for cache values
 */
import { CompressionAlgorithm, CompressionResult } from '../types/index';
/**
 * Compression options
 */
export interface CompressionOptions {
    /**
     * Whether compression is enabled
     */
    enabled?: boolean;
    /**
     * Compression algorithm to use
     */
    algorithm?: CompressionAlgorithm;
    /**
     * Compression level (1-9, higher = better compression but slower)
     */
    level?: number;
    /**
     * Minimum size in bytes for compression
     */
    threshold?: number;
}
/**
 * Default compression options
 */
export declare const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions;
/**
 * Compress data
 *
 * @param data - Data to compress
 * @param algorithm - Compression algorithm
 * @returns Compressed data
 */
export declare function compress(data: string | Buffer, algorithm?: CompressionAlgorithm): Promise<Buffer>;
/**
 * Decompress data
 *
 * @param data - Compressed data
 * @param algorithm - Compression algorithm used
 * @returns Decompressed data
 */
export declare function decompress(data: Buffer, algorithm: CompressionAlgorithm): Promise<Buffer>;
/**
 * Compress data if it meets the threshold
 *
 * @param data - Data to compress
 * @param options - Compression options
 * @returns Compressed data or original data if below threshold
 */
export declare function compressIfNeeded(data: string | Buffer, options?: Partial<CompressionOptions>): Promise<CompressionResult>;
/**
 * Decompress data if it was compressed
 *
 * @param data - Compressed data
 * @param algorithm - Compression algorithm used
 * @returns Decompressed data
 */
export declare function decompressIfNeeded(data: Buffer, algorithm?: CompressionAlgorithm): Promise<Buffer>;
/**
 * Compresses data using the specified algorithm
 *
 * @param data - Data to compress
 * @param algorithm - Compression algorithm
 * @returns Compressed data
 */
export declare function compressData(data: Buffer | string, algorithm?: CompressionAlgorithm): Promise<CompressionResult>;
/**
 * Decompresses data using the specified algorithm
 *
 * @param data - Compressed data
 * @param algorithm - Compression algorithm
 * @returns Decompressed data
 */
export declare function decompressData(data: Buffer, algorithm?: CompressionAlgorithm): Promise<Buffer>;
/**
 * Check if data should be compressed
 *
 * @param data - Data to check
 * @param threshold - Size threshold in bytes
 * @returns Whether data should be compressed
 */
export declare function shouldCompress(data: Buffer | string | any, options?: CompressionOptions): boolean;
export declare function validateAlgorithm(algorithm?: CompressionAlgorithm): CompressionAlgorithm;
