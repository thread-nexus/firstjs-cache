/**
 * @fileoverview Utilities for compressing and decompressing cache data
 */

import zlib from 'zlib';
import { promisify } from 'util';

// Promisify zlib functions
const gzipAsync = promisify(zlib.gzip);
const gunzipAsync = promisify(zlib.gunzip);
const deflateAsync = promisify(zlib.deflate);
const inflateAsync = promisify(zlib.inflate);

/**
 * Compression marker to identify compressed data
 */
const COMPRESSION_MARKER = Buffer.from([0x1f, 0x8b]); // gzip header

/**
 * Compression options
 */
export interface CompressionOptions {
  /**
   * Compression level (1-9, where 9 is maximum compression)
   */
  level?: number;
  
  /**
   * Compression algorithm to use
   */
  algorithm?: 'gzip' | 'deflate';
}

/**
 * Check if data is compressed
 * 
 * @param data - Data to check
 * @returns True if data appears to be compressed
 */
export function isCompressed(data: Buffer | string): boolean {
  if (!Buffer.isBuffer(data)) {
    return false;
  }
  
  // Check for gzip header
  return data.length >= 2 && 
    data[0] === COMPRESSION_MARKER[0] && 
    data[1] === COMPRESSION_MARKER[1];
}

/**
 * Compress data
 * 
 * @param data - Data to compress
 * @param encoding - Encoding for string data
 * @param options - Compression options
 * @returns Compressed data as Buffer
 */
export async function compressData(
  data: string | Buffer,
  encoding: BufferEncoding = 'utf8',
  options: CompressionOptions = {}
): Promise<Buffer> {
  try {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, encoding);
    
    // Skip compression if already compressed
    if (isCompressed(buffer)) {
      return buffer;
    }
    
    const { level = 6, algorithm = 'gzip' } = options;
    
    if (algorithm === 'gzip') {
      return await gzipAsync(buffer, { level });
    } else {
      return await deflateAsync(buffer, { level });
    }
  } catch (error) {
    console.error('Compression error:', error);
    throw new Error(`Failed to compress data: ${error.message}`);
  }
}

/**
 * Decompress data
 * 
 * @param data - Compressed data
 * @param encoding - Output encoding (null for Buffer)
 * @param options - Compression options
 * @returns Decompressed data
 */
export async function decompressData(
  data: Buffer | string,
  encoding: BufferEncoding | null = null,
  options: { algorithm?: 'gzip' | 'deflate' | 'auto' } = {}
): Promise<string | Buffer> {
  try {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'base64');
    
    // Skip decompression if not compressed
    if (!isCompressed(buffer)) {
      return encoding ? buffer.toString(encoding) : buffer;
    }
    
    const { algorithm = 'auto' } = options;
    let decompressed: Buffer;
    
    if (algorithm === 'auto') {
      // Auto-detect based on header
      if (buffer[0] === COMPRESSION_MARKER[0] && buffer[1] === COMPRESSION_MARKER[1]) {
        decompressed = await gunzipAsync(buffer);
      } else {
        decompressed = await inflateAsync(buffer);
      }
    } else if (algorithm === 'gzip') {
      decompressed = await gunzipAsync(buffer);
    } else {
      decompressed = await inflateAsync(buffer);
    }
    
    return encoding ? decompressed.toString(encoding) : decompressed;
  } catch (error) {
    console.error('Decompression error:', error);
    throw new Error(`Failed to decompress data: ${error.message}`);
  }
}

/**
 * Calculate compression ratio
 * 
 * @param original - Original data size
 * @param compressed - Compressed data size
 * @returns Compression ratio as a percentage
 */
export function compressionRatio(original: number, compressed: number): number {
  if (original === 0) return 0;
  return Math.round((1 - (compressed / original)) * 100);
}

/**
 * Determine if compression should be applied based on size
 * 
 * @param size - Data size in bytes
 * @param threshold - Compression threshold in bytes
 * @returns True if compression should be applied
 */
export function shouldCompress(size: number, threshold: number = 1024): boolean {
  return size >= threshold;
}

/**
 * Estimate compressed size
 * 
 * @param size - Original size in bytes
 * @param estimatedRatio - Estimated compression ratio (0-1)
 * @returns Estimated compressed size
 */
export function estimateCompressedSize(size: number, estimatedRatio: number = 0.5): number {
  return Math.round(size * (1 - estimatedRatio));
}