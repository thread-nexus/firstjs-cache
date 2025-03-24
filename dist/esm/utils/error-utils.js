/**
 * @fileoverview Error handling utilities
 */
/**
 * Cache error codes
 */
export var CacheErrorCode;
(function (CacheErrorCode) {
    // General error codes
    CacheErrorCode["UNKNOWN"] = "UNKNOWN";
    CacheErrorCode["NOT_FOUND"] = "NOT_FOUND";
    CacheErrorCode["INVALID_ARGUMENT"] = "INVALID_ARGUMENT";
    CacheErrorCode["KEY_TOO_LONG"] = "KEY_TOO_LONG";
    CacheErrorCode["TIMEOUT"] = "TIMEOUT";
    // Provider errors
    CacheErrorCode["PROVIDER_ERROR"] = "PROVIDER_ERROR";
    CacheErrorCode["NO_PROVIDER"] = "NO_PROVIDER";
    CacheErrorCode["CIRCUIT_OPEN"] = "CIRCUIT_OPEN";
    // Data processing errors
    CacheErrorCode["SERIALIZATION_ERROR"] = "SERIALIZATION_ERROR";
    CacheErrorCode["DESERIALIZATION_ERROR"] = "DESERIALIZATION_ERROR";
    CacheErrorCode["COMPRESSION_ERROR"] = "COMPRESSION_ERROR";
    CacheErrorCode["DATA_INTEGRITY_ERROR"] = "DATA_INTEGRITY_ERROR";
    // Operation errors
    CacheErrorCode["OPERATION_ERROR"] = "OPERATION_ERROR";
    CacheErrorCode["BATCH_ERROR"] = "BATCH_ERROR";
    CacheErrorCode["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    CacheErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    CacheErrorCode["OPERATION_ABORTED"] = "OPERATION_ABORTED";
    // Validation errors
    CacheErrorCode["INVALID_KEY"] = "INVALID_KEY";
    CacheErrorCode["INVALID_OPTIONS"] = "INVALID_OPTIONS";
    CacheErrorCode["INVALID_TTL"] = "INVALID_TTL";
    CacheErrorCode["INVALID_VALUE"] = "INVALID_VALUE";
    CacheErrorCode["INVALID_STATE"] = "INVALID_STATE";
})(CacheErrorCode || (CacheErrorCode = {}));
/**
 * Cache error class
 */
export class CacheError extends Error {
    constructor(code = CacheErrorCode.UNKNOWN, message, operationContext) {
        super(message);
        this.name = 'CacheError';
        this.code = code;
        this.operation = operationContext?.operation;
        this.key = operationContext?.key;
        this.context = operationContext?.context;
        // Ensures proper prototype chain for instanceof checks
        Object.setPrototypeOf(this, CacheError.prototype);
    }
}
/**
 * Create a cache error with context
 */
export function createCacheError(code = CacheErrorCode.UNKNOWN, message, context) {
    return new CacheError(code, message, context);
}
/**
 * Handles cache errors, logs them, and optionally emits events
 */
export function handleCacheError(error, context) {
    // Convert unknown errors to CacheError
    const cacheError = ensureError(error, context);
    // Log error (could be extended to use a proper logger)
    console.error(`Cache error [${cacheError.code}]: ${cacheError.message}`, {
        operation: context?.operation,
        key: context?.key,
        provider: context?.provider
    });
    return cacheError;
}
/**
 * Ensure the error is a CacheError
 */
export function ensureError(error, context) {
    if (error instanceof CacheError) {
        // If already a CacheError, just return it
        return error;
    }
    // Convert Error objects
    if (error instanceof Error) {
        return new CacheError(CacheErrorCode.UNKNOWN, error.message, context);
    }
    // Convert string errors
    if (typeof error === 'string') {
        return new CacheError(CacheErrorCode.UNKNOWN, error, context);
    }
    // Handle all other types
    return new CacheError(CacheErrorCode.UNKNOWN, `Unknown cache error: ${String(error)}`, context);
}
//# sourceMappingURL=error-utils.js.map