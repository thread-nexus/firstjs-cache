/**
 * @fileoverview Error handling utilities
 */

import { CacheOperationContext } from './validation-utils';

/**
 * Cache error codes
 */
export enum CacheErrorCode {
  // General error codes
  UNKNOWN = 'UNKNOWN',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  KEY_TOO_LONG = 'KEY_TOO_LONG',
  TIMEOUT = 'TIMEOUT',
  
  // Provider errors
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  NO_PROVIDER = 'NO_PROVIDER',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  
  // Data processing errors
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  DESERIALIZATION_ERROR = 'DESERIALIZATION_ERROR',
  COMPRESSION_ERROR = 'COMPRESSION_ERROR',
  DATA_INTEGRITY_ERROR = 'DATA_INTEGRITY_ERROR',
  
  // Operation errors
  OPERATION_ERROR = 'OPERATION_ERROR',
  BATCH_ERROR = 'BATCH_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  OPERATION_ABORTED = 'OPERATION_ABORTED',
  
  // Validation errors
  INVALID_KEY = 'INVALID_KEY',
  INVALID_OPTIONS = 'INVALID_OPTIONS',
  INVALID_TTL = 'INVALID_TTL',
  INVALID_VALUE = 'INVALID_VALUE',
  INVALID_STATE = 'INVALID_STATE'
}

/**
 * Cache error class
 */
export class CacheError extends Error {
  public readonly code: CacheErrorCode;
  public readonly operation?: string;
  public readonly key?: string;
  public readonly context?: Record<string, any>;

  constructor(
    code: CacheErrorCode = CacheErrorCode.UNKNOWN,
    message: string,
    operationContext?: CacheOperationContext
  ) {
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
export function createCacheError(
  code: CacheErrorCode = CacheErrorCode.UNKNOWN,
  message: string,
  context?: CacheOperationContext
): CacheError {
  return new CacheError(code, message, context);
}

/**
 * Handles cache errors, logs them, and optionally emits events
 */
export function handleCacheError(
  error: unknown,
  context?: CacheOperationContext
): Error {
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
export function ensureError(
  error: unknown,
  context?: CacheOperationContext
): CacheError {
  if (error instanceof CacheError) {
    // If already a CacheError, just return it
    return error;
  }
  
  // Convert Error objects
  if (error instanceof Error) {
    return new CacheError(
      CacheErrorCode.UNKNOWN,
      error.message,
      context
    );
  }
  
  // Convert string errors
  if (typeof error === 'string') {
    return new CacheError(
      CacheErrorCode.UNKNOWN,
      error,
      context
    );
  }
  
  // Handle all other types
  return new CacheError(
    CacheErrorCode.UNKNOWN,
    `Unknown cache error: ${String(error)}`,
    context
  );
}
