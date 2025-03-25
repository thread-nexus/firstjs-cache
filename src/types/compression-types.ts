/**
 * Supported compression algorithms
 */
export type CompressionAlgorithm = 'gzip' | 'deflate' | 'brotli' | 'none';

/**
 * Compression configuration options
 */
export interface CompressionOptions {
  /**
   * Algorithm to use for compression
   */
  algorithm?: CompressionAlgorithm;
  
  /**
   * Compression level (1-9, where 9 is maximum compression)
   */
  level?: number;
  
  /**
   * Whether to automatically compress values over a certain size
   */
  autoCompress?: boolean;
  
  /**
   * Minimum size in bytes before auto-compression is applied
   */
  thresholdSize?: number;
}

/**
 * Result of a compression operation
 */
export interface CompressionResult {
  /**
   * The compressed data
   */
  data: Buffer | string;
  
  /**
   * Original size in bytes
   */
  originalSize: number;
  
  /**
   * Compressed size in bytes
   */
  compressedSize: number;
  
  /**
   * Compression ratio (originalSize / compressedSize)
   */
  ratio: number;
  
  /**
   * Algorithm used for compression
   */
  algorithm: CompressionAlgorithm;
}
