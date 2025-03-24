/**
 * Default compression options
 */
export const DEFAULT_COMPRESSION_OPTIONS = {
    enabled: true,
    algorithm: 'gzip',
    level: 6,
    threshold: 1024 // 1KB
};
/**
 * Compress data
 *
 * @param data - Data to compress
 * @param algorithm - Compression algorithm
 * @returns Compressed data
 */
export async function compress(data, algorithm = 'gzip') {
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const result = await compressData(buffer, algorithm);
    return result.data;
}
/**
 * Decompress data
 *
 * @param data - Compressed data
 * @param algorithm - Compression algorithm used
 * @returns Decompressed data
 */
export async function decompress(data, algorithm) {
    const result = await decompressData(data, algorithm);
    return Buffer.isBuffer(result) ? result : Buffer.from(result);
}
/**
 * Compress data if it meets the threshold
 *
 * @param data - Data to compress
 * @param options - Compression options
 * @returns Compressed data or original data if below threshold
 */
export async function compressIfNeeded(data, options = {}) {
    const opts = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };
    // Ensure threshold is defined
    const threshold = opts.threshold || DEFAULT_COMPRESSION_OPTIONS.threshold;
    if (!opts.enabled) {
        return {
            data: Buffer.isBuffer(data) ? data : Buffer.from(data),
            compressed: false,
            size: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data),
            originalSize: Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data)
        };
    }
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    // Don't compress if below threshold
    if (buffer.length < threshold) {
        return {
            data: buffer,
            compressed: false,
            size: buffer.length,
            originalSize: buffer.length
        };
    }
    try {
        const result = await compressData(buffer, opts.algorithm);
        // Use size and originalSize properties instead of compressedSize
        if (result.size && result.originalSize && result.size < result.originalSize) {
            return result;
        }
        else {
            return {
                data: buffer,
                compressed: false,
                size: buffer.length,
                originalSize: buffer.length,
                compressionRatio: 1
            };
        }
    }
    catch (error) {
        console.warn('Compression failed, using uncompressed data', error);
        return {
            data: buffer,
            compressed: false,
            size: buffer.length,
            originalSize: buffer.length
        };
    }
}
/**
 * Decompress data if it was compressed
 *
 * @param data - Compressed data
 * @param algorithm - Compression algorithm used
 * @returns Decompressed data
 */
export async function decompressIfNeeded(data, algorithm) {
    if (!algorithm) {
        return data;
    }
    try {
        const result = await decompressData(data, algorithm);
        return Buffer.isBuffer(result) ? result : Buffer.from(result);
    }
    catch (error) {
        throw new Error(`Decompression failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}
/**
 * Compresses data using the specified algorithm
 *
 * @param data - Data to compress
 * @param algorithm - Compression algorithm
 * @returns Compressed data
 */
export async function compressData(data, algorithm = 'gzip') {
    // Ensure we have a buffer
    const buffer = typeof data === 'string' ? Buffer.from(data) : data;
    // Skip compression for small payloads
    const threshold = DEFAULT_COMPRESSION_OPTIONS.threshold;
    if (buffer.length < threshold) {
        return {
            data: buffer,
            originalSize: buffer.length,
            size: buffer.length,
            algorithm,
            compressed: false,
            compressionRatio: 1
        };
    }
    const originalSize = buffer.length;
    let compressedData;
    // In a real implementation, you would use the actual compression libraries
    // This is a placeholder implementation
    switch (algorithm) {
        case 'gzip':
            // Use zlib.gzip in a real implementation
            compressedData = Buffer.from(`gzip-${buffer.toString('base64')}`);
            break;
        case 'deflate':
            // Use zlib.deflate in a real implementation
            compressedData = Buffer.from(`deflate-${buffer.toString('base64')}`);
            break;
        case 'brotli':
            // Use zlib.brotliCompress in a real implementation
            compressedData = Buffer.from(`brotli-${buffer.toString('base64')}`);
            break;
        default:
            compressedData = buffer;
            break;
    }
    return {
        data: compressedData,
        algorithm,
        size: compressedData.length, // Use size instead of compressedSize
        originalSize: buffer.length, // Add originalSize property
        compressed: true,
        compressionRatio: buffer.length > 0 ? compressedData.length / buffer.length : 1
    };
}
/**
 * Decompresses data using the specified algorithm
 *
 * @param data - Compressed data
 * @param algorithm - Compression algorithm
 * @returns Decompressed data
 */
export async function decompressData(data, algorithm = 'gzip') {
    // In a real implementation, you would use the actual decompression libraries
    // This is a placeholder implementation
    switch (algorithm) {
        case 'gzip':
            // Use zlib.gunzip in a real implementation
            if (data.toString().startsWith('gzip-')) {
                return Buffer.from(data.toString().substring(5), 'base64');
            }
            break;
        case 'deflate':
            // Use zlib.inflate in a real implementation
            if (data.toString().startsWith('deflate-')) {
                return Buffer.from(data.toString().substring(8), 'base64');
            }
            break;
        case 'brotli':
            // Use zlib.brotliDecompress in a real implementation
            if (data.toString().startsWith('brotli-')) {
                return Buffer.from(data.toString().substring(7), 'base64');
            }
            break;
        default:
            return data;
    }
    throw new Error(`Unsupported compression algorithm: ${algorithm}`);
}
/**
 * Check if data should be compressed
 *
 * @param data - Data to check
 * @param threshold - Size threshold in bytes
 * @returns Whether data should be compressed
 */
export function shouldCompress(data, options) {
    const threshold = options?.threshold || 1024;
    let size = 0;
    if (Buffer.isBuffer(data)) {
        size = data.length;
    }
    else if (typeof data === 'string') {
        size = Buffer.byteLength(data);
    }
    else {
        try {
            const json = JSON.stringify(data);
            size = Buffer.byteLength(json);
        }
        catch {
            return false;
        }
    }
    return size >= threshold;
}
export function validateAlgorithm(algorithm) {
    if (!algorithm || !['gzip', 'deflate', 'brotli'].includes(algorithm)) {
        return 'gzip';
    }
    return algorithm;
}
//# sourceMappingURL=compression-utils.js.map