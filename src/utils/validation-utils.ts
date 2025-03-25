/**
 * @fileoverview Validation utilities for cache operations
 */

import { CacheOptions } from '../types';
import { CacheErrorCode, createCacheError } from './error-utils';

/**
 * Validate a cache key
 * 
 * @param key Cache key
 * @throws {CacheError} If key is invalid
 */
export function validateCacheKey(key: string): void {
    if (!key) {
        throw createCacheError(
            'Cache key cannot be empty',
            CacheErrorCode.INVALID_KEY
        );
    }
    
    if (typeof key !== 'string') {
        throw createCacheError(
            `Cache key must be a string, got ${typeof key}`,
            CacheErrorCode.INVALID_KEY
        );
    }
    
    if (key.length > 250) {
        throw createCacheError(
            `Cache key length (${key.length}) exceeds maximum length (250)`,
            CacheErrorCode.KEY_TOO_LONG
        );
    }
    
    // Check for invalid characters in key
    if (/[\u0000-\u001f\u007f]/.test(key)) {
        throw createCacheError(
            'Cache key contains invalid control characters',
            CacheErrorCode.INVALID_KEY
        );
    }
}

/**
 * Validate cache options
 * 
 * @param options Cache options
 * @throws {CacheError} If options are invalid
 */
export function validateCacheOptions(options?: CacheOptions): void {
    if (!options) {
        return;
    }
    
    // Validate TTL
    if (options.ttl !== undefined) {
        if (typeof options.ttl !== 'number') {
            throw createCacheError(
                `TTL must be a number, got ${typeof options.ttl}`,
                CacheErrorCode.INVALID_ARGUMENT
            );
        }
        
        if (options.ttl < 0) {
            throw createCacheError(
                `TTL cannot be negative, got ${options.ttl}`,
                CacheErrorCode.INVALID_ARGUMENT
            );
        }
    }
    
    // Validate tags
    if (options.tags !== undefined) {
        if (!Array.isArray(options.tags)) {
            throw createCacheError(
                `Tags must be an array, got ${typeof options.tags}`,
                CacheErrorCode.INVALID_ARGUMENT
            );
        }
        
        for (const tag of options.tags) {
            if (typeof tag !== 'string') {
                throw createCacheError(
                    `Tag must be a string, got ${typeof tag}`,
                    CacheErrorCode.INVALID_ARGUMENT
                );
            }
            
            if (!tag) {
                throw createCacheError(
                    'Tag cannot be empty',
                    CacheErrorCode.INVALID_ARGUMENT
                );
            }
        }
    }
    
    // Validate compression
    if (options.compression !== undefined && typeof options.compression !== 'boolean') {
        throw createCacheError(
            `Compression flag must be a boolean, got ${typeof options.compression}`,
            CacheErrorCode.INVALID_ARGUMENT
        );
    }
}

/**
 * Validate a cache value
 * 
 * @param value Value to validate
 * @throws {CacheError} If value is invalid
 */
export function validateCacheValue(value: any): void {
    if (value === undefined) {
        throw createCacheError(
            'Cache value cannot be undefined',
            CacheErrorCode.INVALID_VALUE
        );
    }
    
    // Check if the value can be serialized
    try {
        JSON.stringify(value);
    } catch (error) {
        throw createCacheError(
            `Cache value cannot be serialized: ${(error as Error).message}`,
            CacheErrorCode.INVALID_VALUE,
            error as Error
        );
    }
}

/**
 * Check if a pattern is a valid regex pattern
 * 
 * @param pattern Pattern to validate
 * @returns Whether the pattern is valid
 */
export function isValidPattern(pattern: string): boolean {
    try {
        new RegExp(pattern);
        return true;
    } catch {
        return false;
    }
}

/**
 * Ensure a value is within specified bounds
 * 
 * @param value Value to check
 * @param min Minimum value
 * @param max Maximum value
 * @param name Name for error message
 * @returns Value within bounds
 */
export function ensureWithinBounds(
    value: number,
    min: number,
    max: number,
    name: string
): number {
    if (value < min) {
        return min;
    }
    
    if (value > max) {
        return max;
    }
    
    return value;
}

/**
 * Create a key validator function
 * 
 * @param options Validation options
 * @returns Validator function
 */
export function createKeyValidator(options: {
    maxLength?: number;
    allowedChars?: RegExp;
    prefix?: string;
    throwOnInvalid?: boolean;
} = {}): (key: string) => boolean {
    const maxLength = options.maxLength ?? 250;
    const allowedChars = options.allowedChars ?? /^[\w\-:.]+$/;
    const prefix = options.prefix ?? '';
    const throwOnInvalid = options.throwOnInvalid ?? false;
    
    return function validateKey(key: string): boolean {
        try {
            // Check basic type
            if (typeof key !== 'string') {
                throw createCacheError(
                    `Key must be a string, got ${typeof key}`,
                    CacheErrorCode.INVALID_KEY
                );
            }
            
            // Check emptiness
            if (!key) {
                throw createCacheError(
                    'Key cannot be empty',
                    CacheErrorCode.INVALID_KEY
                );
            }
            
            // Check prefix
            if (prefix && !key.startsWith(prefix)) {
                throw createCacheError(
                    `Key must start with "${prefix}"`,
                    CacheErrorCode.INVALID_KEY
                );
            }
            
            // Check length
            if (key.length > maxLength) {
                throw createCacheError(
                    `Key length (${key.length}) exceeds maximum length (${maxLength})`,
                    CacheErrorCode.KEY_TOO_LONG
                );
            }
            
            // Check allowed characters
            if (!allowedChars.test(key)) {
                throw createCacheError(
                    'Key contains invalid characters',
                    CacheErrorCode.INVALID_KEY
                );
            }
            
            return true;
        } catch (error) {
            if (throwOnInvalid) {
                throw error;
            }
            return false;
        }
    };
}