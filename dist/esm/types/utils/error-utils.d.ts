/**
 * @fileoverview Error handling utilities
 */
import { CacheOperationContext } from './validation-utils';
/**
 * Cache error codes
 */
export declare enum CacheErrorCode {
    UNKNOWN = "UNKNOWN",
    NOT_FOUND = "NOT_FOUND",
    INVALID_ARGUMENT = "INVALID_ARGUMENT",
    KEY_TOO_LONG = "KEY_TOO_LONG",
    TIMEOUT = "TIMEOUT",
    PROVIDER_ERROR = "PROVIDER_ERROR",
    NO_PROVIDER = "NO_PROVIDER",
    CIRCUIT_OPEN = "CIRCUIT_OPEN",
    SERIALIZATION_ERROR = "SERIALIZATION_ERROR",
    DESERIALIZATION_ERROR = "DESERIALIZATION_ERROR",
    COMPRESSION_ERROR = "COMPRESSION_ERROR",
    DATA_INTEGRITY_ERROR = "DATA_INTEGRITY_ERROR",
    OPERATION_ERROR = "OPERATION_ERROR",
    BATCH_ERROR = "BATCH_ERROR",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    NETWORK_ERROR = "NETWORK_ERROR",
    OPERATION_ABORTED = "OPERATION_ABORTED",
    INVALID_KEY = "INVALID_KEY",
    INVALID_OPTIONS = "INVALID_OPTIONS",
    INVALID_TTL = "INVALID_TTL",
    INVALID_VALUE = "INVALID_VALUE",
    INVALID_STATE = "INVALID_STATE"
}
/**
 * Cache error class
 */
export declare class CacheError extends Error {
    readonly code: CacheErrorCode;
    readonly operation?: string;
    readonly key?: string;
    readonly context?: Record<string, any>;
    constructor(code: CacheErrorCode | undefined, message: string, operationContext?: CacheOperationContext);
}
/**
 * Create a cache error with context
 */
export declare function createCacheError(code: CacheErrorCode | undefined, message: string, context?: CacheOperationContext): CacheError;
/**
 * Handles cache errors, logs them, and optionally emits events
 */
export declare function handleCacheError(error: unknown, context?: CacheOperationContext): Error;
/**
 * Ensure the error is a CacheError
 */
export declare function ensureError(error: unknown, context?: CacheOperationContext): CacheError;
