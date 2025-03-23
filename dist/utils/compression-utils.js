"use strict";
/**
 * @fileoverview High-performance compression utilities for cache data
 * with adaptive compression strategies and size optimization.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.shouldCompress = shouldCompress;
exports.compressIfNeeded = compressIfNeeded;
exports.decompressIfNeeded = decompressIfNeeded;
const cache_events_1 = require("../events/cache-events");
// Compression performance thresholds
const MIN_COMPRESSION_SIZE = 1024; // 1KB
const COMPRESSION_RATIO_THRESHOLD = 0.8; // Don't store if compressed size > 80% of original
/**
 * Compression strategies for different data types
 * @internal
 */
const compressionStrategies = {
    /**
     * JSON compression by removing whitespace
     */
    json: {
        compress: (data) => {
            try {
                return JSON.stringify(JSON.parse(data));
            }
            catch (_a) {
                return data;
            }
        },
        decompress: (data) => data
    },
    /**
     * Simple RLE (Run-Length Encoding) for repeated characters
     */
    rle: {
        compress: (data) => {
            let result = '';
            let count = 1;
            let prev = data[0];
            for (let i = 1; i < data.length; i++) {
                if (data[i] === prev) {
                    count++;
                }
                else {
                    result += (count > 3) ? `${count}${prev}` : prev.repeat(count);
                    prev = data[i];
                    count = 1;
                }
            }
            result += (count > 3) ? `${count}${prev}` : prev.repeat(count);
            return result;
        },
        decompress: (data) => {
            let result = '';
            let i = 0;
            while (i < data.length) {
                const count = parseInt(data[i]);
                if (isNaN(count)) {
                    result += data[i];
                    i++;
                }
                else {
                    let numStr = '';
                    while (!isNaN(parseInt(data[i]))) {
                        numStr += data[i];
                        i++;
                    }
                    result += data[i].repeat(parseInt(numStr));
                    i++;
                }
            }
            return result;
        }
    },
    /**
     * LZ-style dictionary compression for repeated patterns
     */
    dictionary: {
        compress: (data) => {
            const dictionary = new Map();
            let result = '';
            let current = '';
            let dictSize = 256;
            for (let i = 0; i < 256; i++) {
                dictionary.set(String.fromCharCode(i), i);
            }
            for (const char of data) {
                const phrase = current + char;
                if (dictionary.has(phrase)) {
                    current = phrase;
                }
                else {
                    result += `${dictionary.get(current)},`;
                    dictionary.set(phrase, dictSize++);
                    current = char;
                }
            }
            if (current !== '') {
                result += dictionary.get(current);
            }
            return result;
        },
        decompress: (data) => {
            const dictionary = new Map();
            let dictSize = 256;
            for (let i = 0; i < 256; i++) {
                dictionary.set(i, String.fromCharCode(i));
            }
            const codes = data.split(',').map(Number);
            const firstCode = codes[0];
            if (firstCode === undefined || !dictionary.has(firstCode)) {
                throw new Error('Invalid compressed data');
            }
            let result = dictionary.get(firstCode);
            let current = result;
            for (let i = 1; i < codes.length; i++) {
                const code = codes[i];
                let phrase;
                if (dictionary.has(code)) {
                    const value = dictionary.get(code);
                    if (value === undefined) {
                        throw new Error('Invalid dictionary state');
                    }
                    phrase = value;
                }
                else if (code === dictSize) {
                    phrase = current + current[0];
                }
                else {
                    throw new Error('Invalid compressed data');
                }
                result += phrase;
                dictionary.set(dictSize++, current + phrase[0]);
                current = phrase;
            }
            return result;
        }
    }
};
/**
 * Check if compression should be applied to data
 *
 * @param data - The data to potentially compress
 * @param options - Cache options including compression settings
 * @returns Whether compression should be applied
 *
 * @complexity Time: O(1)
 * @category Compression
 */
function shouldCompress(data, options) {
    if (!(options === null || options === void 0 ? void 0 : options.compression)) {
        return false;
    }
    const threshold = options.compressionThreshold || MIN_COMPRESSION_SIZE;
    return data.length > threshold;
}
/**
 * Select the best compression strategy for given data
 *
 * @param data - The data to analyze
 * @returns The name of the best compression strategy
 *
 * @complexity Time: O(n) where n is data length
 * @internal
 */
function selectCompressionStrategy(data) {
    // For JSON data, use JSON compression
    if ((data.startsWith('{') && data.endsWith('}')) ||
        (data.startsWith('[') && data.endsWith(']'))) {
        return 'json';
    }
    // For data with many repeated characters, use RLE
    let repeatedChars = 0;
    for (let i = 1; i < data.length; i++) {
        if (data[i] === data[i - 1])
            repeatedChars++;
    }
    if (repeatedChars / data.length > 0.3) {
        return 'rle';
    }
    // Default to dictionary compression
    return 'dictionary';
}
/**
 * Compress data using the most efficient strategy
 *
 * @param data - The data to compress
 * @param options - Compression options
 * @returns Compressed data with metadata
 *
 * @complexity Time: O(n) where n is data length
 * @category Compression
 * @priority Critical
 *
 * @example
 * ```typescript
 * const { value, compressed } = await compressIfNeeded(
 *   largeJsonString,
 *   { compression: true }
 * );
 * ```
 */
function compressIfNeeded(data, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!shouldCompress(data, options)) {
            return { value: data, compressed: false };
        }
        const startTime = performance.now();
        try {
            const strategy = selectCompressionStrategy(data);
            const compressed = compressionStrategies[strategy].compress(data);
            // Only use compression if it provides meaningful reduction
            if (compressed.length > data.length * COMPRESSION_RATIO_THRESHOLD) {
                return { value: data, compressed: false };
            }
            const duration = performance.now() - startTime;
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.SET, {
                message: 'Compression complete',
                duration,
                originalSize: data.length,
                compressedSize: compressed.length,
                strategy
            });
            return {
                value: `${strategy}:${compressed}`,
                compressed: true
            };
        }
        catch (error) {
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.ERROR, {
                error,
                message: 'Compression failed'
            });
            return { value: data, compressed: false };
        }
    });
}
/**
 * Decompress data if it was previously compressed
 *
 * @param data - The data to decompress
 * @param wasCompressed - Whether the data was compressed
 * @returns Decompressed data
 *
 * @complexity Time: O(n) where n is compressed data length
 * @category Compression
 * @priority Critical
 */
function decompressIfNeeded(data, wasCompressed) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!wasCompressed) {
            return data;
        }
        const startTime = performance.now();
        try {
            const [strategy, compressed] = data.split(':');
            const decompressed = compressionStrategies[strategy]
                .decompress(compressed);
            const duration = performance.now() - startTime;
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.GET, {
                message: 'Decompression complete',
                duration,
                originalSize: compressed.length,
                decompressedSize: decompressed.length,
                strategy
            });
            return decompressed;
        }
        catch (error) {
            (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.ERROR, {
                error,
                message: 'Decompression failed'
            });
            throw error;
        }
    });
}
// Documentation metadata
exports.metadata = {
    category: "Compression" /* DocCategory.COMPRESSION */,
    priority: 2 /* DocPriority.HIGH */,
    complexity: {
        time: 'O(n) for compression/decompression',
        space: 'O(n) for dictionary storage',
        impact: "moderate" /* PerformanceImpact.MODERATE */,
        notes: 'Adaptive compression strategy selection based on data characteristics'
    },
    examples: [{
            title: 'Basic Compression',
            code: `
      const { value, compressed } = await compressIfNeeded(
        largeData,
        { compression: true, compressionThreshold: 1024 }
      );
      // Later...
      const original = await decompressIfNeeded(value, compressed);
    `,
            description: 'Compress and decompress large cache values'
        }],
    since: '1.0.0'
};
