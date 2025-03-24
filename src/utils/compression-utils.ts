/**
 * @fileoverview Utilities for compressing and decompressing cache data
 */

import { gzip, gunzip } from 'zlib';
import { promisify } from 'util';

// Promisified zlib functions
const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
/**
 * Compress data
 * 
 * @param data - Data to compress
 * @param encoding - Encoding to use for string data
 * @returns Compressed data
 */
export async function compressData(
  data: string | Buffer,
  encoding: BufferEncoding = 'utf8'
): Promise<Buffer> {
  const buffer = typeof data === 'string' ? Buffer.from(data, encoding) : data;
  return gzipAsync(buffer);
}
    
/**
 * Decompress data
 * 
 * @param data - Data to decompress
 * @param encoding - Encoding to use for string output
 * @returns Decompressed data
 */
export async function decompressData(
  data: Buffer,
  encoding?: BufferEncoding
): Promise<string | Buffer> {
  const buffer = await gunzipAsync(data);
      return encoding ? buffer.toString(encoding) : buffer;
    }
    
/**
 * Check if data should be compressed
 * 
 * @param data - Data to check
 * @param threshold - Size threshold in bytes
 * @returns Whether data should be compressed
 */
export function shouldCompress(data: any, threshold: number = 1024): boolean {
  // Don't compress small data
  if (threshold <= 0) {
    return false;
}

  // Only compress strings and objects
  if (typeof data !== 'string' && (typeof data !== 'object' || data === null)) {
    return false;
  }
  
  // Check size
  try {
    const serialized = typeof data === 'string' ? data : JSON.stringify(data);
    return Buffer.byteLength(serialized, 'utf8') >= threshold;
  } catch (e) {
    return false;
  }
}
