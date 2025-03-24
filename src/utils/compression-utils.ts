/**
 * Compression utilities for cache operations
 */

import { CompressionResult, CompressionAlgorithm, CompressionOptions } from '../types/common';
import { CacheErrorCode, createCacheError } from './error-utils';

// Default compression options
const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  algorithm: 'gzip',
  level: 6,
  threshold: 1024,
  enabled: true
};

/**
 * Compress data
 * 
 * @param data - Data to compress
 * @param options - Compression options
 * @returns Compression result
 */
export async function compress(
  data: string | Buffer | Uint8Array,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };
  
  try {
    // Skip compression if disabled or data is too small
    if (!opts.enabled || (typeof data === 'string' && data.length < (opts.threshold || 0)) || 
        (Buffer.isBuffer(data) && data.length < (opts.threshold || 0))) {
      return {
        data: data,
        originalSize: typeof data === 'string' ? Buffer.byteLength(data) : data.length,
        compressedSize: typeof data === 'string' ? Buffer.byteLength(data) : data.length,
        ratio: 1,
        algorithm: 'none',
        compressionTime: 0,
        compressed: false,
        size: typeof data === 'string' ? Buffer.byteLength(data) : data.length
      };
    }
    
    const startTime = Date.now();
    let compressedData: Buffer;
    
    // Convert string to buffer if needed
    const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
    
    // Choose compression algorithm
    switch (opts.algorithm) {
      case 'gzip':
        compressedData = await gzipCompress(buffer, opts.level || 6);
        break;
      case 'deflate':
        compressedData = await deflateCompress(buffer, opts.level || 6);
        break;
      case 'brotli':
        compressedData = await brotliCompress(buffer, opts.level || 6);
        break;
      case 'lz4':
        compressedData = await lz4Compress(buffer);
        break;
      default:
        // No compression
        return {
          data: buffer,
          originalSize: buffer.length,
          compressedSize: buffer.length,
          ratio: 1,
          algorithm: 'none',
          compressionTime: 0,
          compressed: false,
          size: buffer.length
        };
    }
    
    const endTime = Date.now();
    
    // Check if compression actually reduced size
    if (compressedData.length >= buffer.length) {
      return {
        data: buffer,
        originalSize: buffer.length,
        compressedSize: buffer.length,
        ratio: 1,
        algorithm: 'none',
        compressionTime: endTime - startTime,
        compressed: false,
        size: buffer.length
      };
    }
    
    return {
      data: compressedData,
      originalSize: buffer.length,
      compressedSize: compressedData.length,
      ratio: compressedData.length / buffer.length,
      algorithm: opts.algorithm,
      compressionTime: endTime - startTime,
      compressed: true,
      size: compressedData.length
    };
  } catch (error) {
    // Return uncompressed data on error
    const buffer = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
    
    return {
      data: buffer,
      originalSize: buffer.length,
      compressedSize: buffer.length,
      ratio: 1,
      algorithm: 'none',
      compressionTime: 0,
      compressed: false,
      size: buffer.length
    };
  }
}

/**
 * Decompress data
 * 
 * @param data - Data to decompress
 * @param algorithm - Compression algorithm
 * @returns Decompressed data
 */
export async function decompress(
  data: Buffer | Uint8Array,
  algorithm: CompressionAlgorithm
): Promise<Buffer> {
  try {
    // Skip decompression if not compressed
    if (algorithm === 'none') {
      return Buffer.from(data);
    }
    
    // Choose decompression algorithm
    switch (algorithm) {
      case 'gzip':
        return await gzipDecompress(data);
      case 'deflate':
        return await deflateDecompress(data);
      case 'brotli':
        return await brotliDecompress(data);
      case 'lz4':
        return await lz4Decompress(data);
      default:
        return Buffer.from(data);
    }
  } catch (error) {
    throw createCacheError(
      `Decompression failed: ${error instanceof Error ? error.message : String(error)}`,
      CacheErrorCode.DECOMPRESSION_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Compress data using gzip
 * 
 * @param data - Data to compress
 * @param level - Compression level
 * @returns Compressed data
 */
async function gzipCompress(data: Buffer, level: number): Promise<Buffer> {
  try {
    // Use zlib if available
    const zlib = await import('zlib');
    const util = await import('util');
    
    const gzip = util.promisify(zlib.gzip);
    return await gzip(data, { level });
  } catch (error) {
    throw createCacheError(
      `Gzip compression failed: ${error instanceof Error ? error.message : String(error)}`,
      CacheErrorCode.COMPRESSION_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Decompress data using gzip
 * 
 * @param data - Data to decompress
 * @returns Decompressed data
 */
async function gzipDecompress(data: Buffer | Uint8Array): Promise<Buffer> {
  try {
    // Use zlib if available
    const zlib = await import('zlib');
    const util = await import('util');
    
    const gunzip = util.promisify(zlib.gunzip);
    return await gunzip(data);
  } catch (error) {
    throw createCacheError(
      `Gzip decompression failed: ${error instanceof Error ? error.message : String(error)}`,
      CacheErrorCode.DECOMPRESSION_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Compress data using deflate
 * 
 * @param data - Data to compress
 * @param level - Compression level
 * @returns Compressed data
 */
async function deflateCompress(data: Buffer, level: number): Promise<Buffer> {
  try {
    // Use zlib if available
    const zlib = await import('zlib');
    const util = await import('util');
    
    const deflate = util.promisify(zlib.deflate);
    return await deflate(data, { level });
  } catch (error) {
    throw createCacheError(
      `Deflate compression failed: ${error instanceof Error ? error.message : String(error)}`,
      CacheErrorCode.COMPRESSION_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Decompress data using deflate
 * 
 * @param data - Data to decompress
 * @returns Decompressed data
 */
async function deflateDecompress(data: Buffer | Uint8Array): Promise<Buffer> {
  try {
    // Use zlib if available
    const zlib = await import('zlib');
    const util = await import('util');
    
    const inflate = util.promisify(zlib.inflate);
    return await inflate(data);
  } catch (error) {
    throw createCacheError(
      `Deflate decompression failed: ${error instanceof Error ? error.message : String(error)}`,
      CacheErrorCode.DECOMPRESSION_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Compress data using brotli
 * 
 * @param data - Data to compress
 * @param level - Compression level
 * @returns Compressed data
 */
async function brotliCompress(data: Buffer, level: number): Promise<Buffer> {
  try {
    // Use zlib if available
    const zlib = await import('zlib');
    const util = await import('util');
    
    const brotliCompress = util.promisify(zlib.brotliCompress);
    return await brotliCompress(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: level } });
  } catch (error) {
    throw createCacheError(
      `Brotli compression failed: ${error instanceof Error ? error.message : String(error)}`,
      CacheErrorCode.COMPRESSION_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Decompress data using brotli
 * 
 * @param data - Data to decompress
 * @returns Decompressed data
 */
async function brotliDecompress(data: Buffer | Uint8Array): Promise<Buffer> {
  try {
    // Use zlib if available
    const zlib = await import('zlib');
    const util = await import('util');
    
    const brotliDecompress = util.promisify(zlib.brotliDecompress);
    return await brotliDecompress(data);
  } catch (error) {
    throw createCacheError(
      `Brotli decompression failed: ${error instanceof Error ? error.message : String(error)}`,
      CacheErrorCode.DECOMPRESSION_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Compress data using lz4
 * 
 * @param data - Data to compress
 * @returns Compressed data
 */
async function lz4Compress(data: Buffer): Promise<Buffer> {
  try {
    // For now, return uncompressed data as lz4 is not built-in to Node.js
    // In a real implementation, you would use a library like lz4-js
    return data;
  } catch (error) {
    throw createCacheError(
      `LZ4 compression failed: ${error instanceof Error ? error.message : String(error)}`,
      CacheErrorCode.COMPRESSION_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Decompress data using lz4
 * 
 * @param data - Data to decompress
 * @returns Decompressed data
 */
async function lz4Decompress(data: Buffer | Uint8Array): Promise<Buffer> {
  try {
    // For now, return uncompressed data as lz4 is not built-in to Node.js
    // In a real implementation, you would use a library like lz4-js
    return Buffer.from(data);
  } catch (error) {
    throw createCacheError(
      `LZ4 decompression failed: ${error instanceof Error ? error.message : String(error)}`,
      CacheErrorCode.DECOMPRESSION_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Check if compression should be applied
 * 
 * @param data - Data to check
 * @param options - Compression options
 * @returns Whether compression should be applied
 */
export function shouldCompress(
  data: string | Buffer | Uint8Array,
  options: CompressionOptions = {}
): boolean {
  const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };
  
  // Skip compression if disabled
  if (!opts.enabled) {
    return false;
  }
  
  // Check size threshold
  const size = typeof data === 'string' ? Buffer.byteLength(data) : data.length;
  return size >= (opts.threshold || 0);
}

/**
 * Compress if needed
 * 
 * @param data - Data to compress
 * @param options - Compression options
 * @returns Compression result
 */
export async function compressIfNeeded(
  data: string | Buffer | Uint8Array,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  if (shouldCompress(data, options)) {
    return compress(data, options);
  }
  
  // Return uncompressed data
  const size = typeof data === 'string' ? Buffer.byteLength(data) : data.length;
  
  return {
    data,
    originalSize: size,
    compressedSize: size,
    ratio: 1,
    algorithm: 'none',
    compressionTime: 0,
    compressed: false,
    size
  };
}