/**
 * @fileoverview Performance metrics type definitions
 */

import {CacheOperationContext} from './common';

/**
 * Performance metrics for cache operations
 */
export interface PerformanceMetrics {
    /** Duration of the operation in milliseconds */
    duration: number;

    /** Number of cache hits */
    hits: number;

    /** Number of cache misses */
    misses: number;

    /** Latency in milliseconds */
    latency: number;

    /** Memory usage in bytes */
    memoryUsage: number;

    /** Timestamp when the metrics were recorded */
    timestamp: number;

    /** Whether the operation was successful */
    success: boolean;

    /** Whether the operation resulted in an error */
    error?: boolean;

    /** Size of the data in bytes */
    size?: number;

    /** Operation count for batch operations */
    operationCount?: number;
}

/**
 * Performance metrics context for error handling
 */
export type PerformanceMetricsContext = CacheOperationContext;
