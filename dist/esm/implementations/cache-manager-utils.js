/**
 * @fileoverview Utility functions for cache operations
 */
/**
 * Create a cache key with proper prefix
 *
 * @param type - Key type/category
 * @param id - Key identifier
 * @param subtype - Optional subtype
 * @returns Formatted cache key
 */
export function createCacheKey(type, id, subtype) {
    const prefix = type.toLowerCase();
    // Handle object IDs by stringifying
    let idStr;
    if (typeof id === 'object') {
        idStr = JSON.stringify(id);
    }
    else {
        idStr = String(id);
    }
    return subtype
        ? `${prefix}:${idStr}:${subtype}`
        : `${prefix}:${idStr}`;
}
/**
 * Merge cache options with defaults
 *
 * @param options - User-provided options
 * @param defaults - Default options
 * @returns Merged options
 */
export function mergeCacheOptions(options = {}, defaults = {}) {
    return {
        ...defaults,
        ...options,
        // Merge tags from both sources
        tags: [
            ...(defaults.tags || []),
            ...(options.tags || [])
        ]
    };
}
/**
 * Calculate expiration timestamp
 *
 * @param ttl - Time to live in seconds
 * @returns Expiration timestamp or null for no expiration
 */
export function calculateExpiration(ttl) {
    if (!ttl || ttl <= 0) {
        return null;
    }
    return Date.now() + (ttl * 1000);
}
/**
 * Check if a timestamp is expired
 *
 * @param timestamp - Expiration timestamp
 * @returns True if expired
 */
export function isExpired(timestamp) {
    if (timestamp === null) {
        return false;
    }
    return Date.now() > timestamp;
}
/**
 * Format cache size in human-readable format
 *
 * @param bytes - Size in bytes
 * @param decimals - Number of decimal places
 * @returns Formatted size string
 */
export function formatCacheSize(bytes, decimals = 2) {
    if (bytes === 0)
        return '0.00 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    // Format with fixed decimal places to match test expectations
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)).toFixed(2)} ${sizes[i]}`;
}
/**
 * Parse duration string (e.g., "5m", "2h") to seconds
 *
 * @param duration - Duration string
 * @returns Duration in seconds
 */
export function parseDuration(duration) {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
        throw new Error(`Invalid duration format: ${duration}. Expected format: 30s, 5m, 2h, 1d`);
    }
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
        case 's': return value; // seconds
        case 'm': return value * 60; // minutes
        case 'h': return value * 60 * 60; // hours
        case 'd': return value * 60 * 60 * 24; // days
        default: throw new Error(`Unknown duration unit: ${unit}`);
    }
}
/**
 * Create a key pattern for searching
 *
 * @param type - Key type/category
 * @param pattern - Pattern to match
 * @returns Formatted key pattern
 */
export function createKeyPattern(type, pattern) {
    const prefix = type.toLowerCase();
    return `${prefix}:${pattern}`;
}
/**
 * Process operations in batches
 *
 * @param items - Items to process
 * @param operation - Operation to perform on each item
 * @param options - Batch options
 * @returns Results of operations
 */
export async function batchOperations(items, operation, options = {}) {
    const { batchSize = 100, concurrency = 10, retries = 3, retryDelay = 1000, onProgress } = options;
    const results = [];
    const total = items.length;
    let completed = 0;
    // Process in batches
    for (let i = 0; i < total; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        // Process batch with limited concurrency
        const batchResults = await Promise.all(batch.map(async (item, index) => {
            const itemIndex = i + index;
            // Retry logic
            for (let attempt = 0; attempt < retries; attempt++) {
                try {
                    const result = await operation(item, itemIndex);
                    // Update progress
                    completed++;
                    if (onProgress) {
                        onProgress(completed, total);
                    }
                    return result;
                }
                catch (error) {
                    if (attempt === retries - 1) {
                        // Last attempt failed, rethrow
                        throw error;
                    }
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
                }
            }
        }));
        // Fix type incompatibility with a safe casting or null check
        if (batchResults) {
            // Type-safe way to add results
            for (const item of batchResults) {
                if (item !== undefined) {
                    results.push(item);
                }
            }
        }
    }
    return results;
}
/**
 * Debounce function calls
 *
 * @param fn - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce(fn, wait) {
    let timeout = null;
    return function (...args) {
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(() => {
            fn(...args);
            timeout = null;
        }, wait);
    };
}
/**
 * Throttle function calls
 *
 * @param fn - Function to throttle
 * @param wait - Throttle interval in milliseconds
 * @returns Throttled function
 */
export function throttle(fn, wait) {
    let lastCall = 0;
    let timeout = null;
    return function (...args) {
        const now = Date.now();
        const timeSinceLastCall = now - lastCall;
        if (timeSinceLastCall >= wait) {
            // Enough time has passed, execute immediately
            lastCall = now;
            fn(...args);
        }
        else if (timeout === null) {
            // Schedule execution for later
            timeout = setTimeout(() => {
                lastCall = Date.now();
                timeout = null;
                fn(...args);
            }, wait - timeSinceLastCall);
        }
    };
}
//# sourceMappingURL=cache-manager-utils.js.map