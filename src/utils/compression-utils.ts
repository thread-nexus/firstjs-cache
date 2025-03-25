/**
 * @fileoverview Utilities for compressing cache data
 */

import {CacheErrorCode, createCacheError} from './error-utils';
import {CompressionAlgorithm, CompressionOptions, CompressionResult} from '../types';

// Import compression libraries if available
let zlib: any;
try {
  zlib = require('zlib');
} catch (e) {
  // Zlib not available, will use fallbacks
}

/**
 * Default compression options
 */
const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  algorithm: 'gzip',
  level: 6,
  autoCompress: true,
  thresholdSize: 1024 // 1KB
};

/**
 * Check if compression is available
 */
export function isCompressionAvailable(): boolean {
  return !!zlib;
}

/**
 * Compress data
 * 
 * @param data Data to compress
 * @param options Compression options
 * @returns Compression result
 */
export async function compress(
  data: string | Buffer,
  options: Partial<CompressionOptions> = {}
): Promise<CompressionResult> {
  // Merge options with defaults
  const opts: CompressionOptions = {
    ...DEFAULT_COMPRESSION_OPTIONS,
    ...options
  };

  // Ensure data is a buffer
  const inputBuffer = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
  const originalSize = inputBuffer.length;

  // Check if size meets threshold for auto compression
  if (opts.autoCompress && originalSize < (opts.thresholdSize || 1024)) {
    return {
      data: inputBuffer,
      originalSize,
      compressedSize: originalSize,
      ratio: 1,
      algorithm: 'none'
    };
  }

  // Check if compression is available
  if (!isCompressionAvailable()) {
    return {
      data: inputBuffer,
      originalSize,
      compressedSize: originalSize,
      ratio: 1,
      algorithm: 'none'
    };
  }

  try {
    let compressedData: Buffer;
    const algorithm = opts.algorithm || 'gzip';
    const level = opts.level || 6;

    switch (algorithm) {
      case 'gzip':
        compressedData = await promisifyZlib(
          zlib.gzip,
          inputBuffer,
          { level }
        );
        break;
      case 'deflate':
        compressedData = await promisifyZlib(
          zlib.deflate,
          inputBuffer,
          { level }
        );
        break;
      case 'brotli':
        if (!zlib.brotliCompress) {
          throw new Error('Brotli compression not available');
        }
        compressedData = await promisifyZlib(
          zlib.brotliCompress,
          inputBuffer,
          { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: level } }
        );
        break;
      case 'none':
      default:
        return {
          data: inputBuffer,
          originalSize,
          compressedSize: originalSize,
          ratio: 1,
          algorithm: 'none'
        };
    }

    const compressedSize = compressedData.length;
    const ratio = originalSize / compressedSize;

    return {
      data: compressedData,
      originalSize,
      compressedSize,
      ratio,
      algorithm
    };
  } catch (error) {
    throw createCacheError(
      `Compression failed: ${error instanceof Error ? error.message : String(error)}`,
      CacheErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Decompress data
 * 
 * @param data Compressed data
 * @param algorithm Compression algorithm
 * @returns Decompressed data
 */
export async function decompress(
  data: Buffer,
  algorithm: CompressionAlgorithm = 'gzip'
): Promise<Buffer> {
  // No compression
  if (algorithm === 'none') {
    return data;
  }

  // Check if compression is available
  if (!isCompressionAvailable()) {
    throw createCacheError(
      'Compression libraries not available',
      CacheErrorCode.DECOMPRESSION_ERROR
    );
  }

  try {
    switch (algorithm) {
      case 'gzip':
        return await promisifyZlib(zlib.gunzip, data);
      case 'deflate':
        return await promisifyZlib(zlib.inflate, data);
      case 'brotli':
        if (!zlib.brotliDecompress) {
          throw new Error('Brotli decompression not available');
        }
        return await promisifyZlib(zlib.brotliDecompress, data);
      default:
        throw new Error(`Unsupported compression algorithm: ${algorithm}`);
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
 * Promisify zlib function
 * 
 * @param fn Zlib function
 * @param data Input data
 * @param options Options
 * @returns Promise with result
 */
function promisifyZlib(
  fn: (buffer: Buffer, options: any, callback: (error: Error | null, result: Buffer) => void) => void,
  data: Buffer,
  options: any = {}
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fn(data, options, (error: Error | null, result: Buffer) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Detect if data is compressed
 * 
 * @param data Data to check
 * @returns Detected algorithm or null
 */
export function detectCompression(data: Buffer): CompressionAlgorithm | null {
  if (!data || data.length < 3) {
    return null;
  }

  // Check gzip magic number (1F 8B)
  if (data[0] === 0x1F && data[1] === 0x8B) {
    return 'gzip';
  }

  // Check deflate header (78 01, 78 9C, 78 DA)
  if (data[0] === 0x78 && (data[1] === 0x01 || data[1] === 0x9C || data[1] === 0xDA)) {
    return 'deflate';
  }

  // Brotli doesn't have a reliable magic number, but often starts with 0xCE
  if (data[0] === 0xCE) {
    return 'brotli';
  }

  return null;
}