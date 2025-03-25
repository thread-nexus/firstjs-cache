/**
 * Cache compute types
 */

import {CacheOptions} from '../types';

/**
 * Options for compute operations
 */
export interface ComputeOptions extends CacheOptions {
    maxRetries?: number;
    retryDelay?: number;
    timeout?: number;
    staleIfError?: boolean;
}

/**
 * Result of a compute operation
 */
export interface ComputeResult<T> {
    value: T;
    computeTime: number;
    stale: boolean;
}

/**
 * Extended cache options that includes metadata
 */
export interface ExtendedCacheOptions extends CacheOptions {
    metadata?: {
        computeTime?: number;
        source?: string;
        version?: string;
        [key: string]: any;
    };
}

/**
 * Internal cache options for implementation use
 */
export interface InternalCacheOptions {
    ttl?: number;
    tags?: string[];
    // Standard properties from CacheOptions
    compression?: boolean;
    compressionThreshold?: number;
    background?: boolean;
    maxSize?: number;
    maxItems?: number;
    compressionLevel?: number;
    refreshThreshold?: number;
    statsInterval?: number;
    providers?: string[];
    defaultProvider?: string;
    backgroundRefresh?: boolean;
    operation?: string;
    computeTime?: number;
    maxRetries?: number;
    compressed?: boolean;
    // Additional internal properties for metadata
    _metadata?: {
        computeTime?: number;
        source?: string;
        timestamp?: number;
        [key: string]: any;
    };
}