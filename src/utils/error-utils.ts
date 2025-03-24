/**
 * Error utilities for cache operations
 */

/**
 * Cache error codes
 */
export enum CacheErrorCode {
  INVALID_KEY = 'INVALID_KEY',
  INVALID_VALUE = 'INVALID_VALUE',
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  DESERIALIZATION_ERROR = 'DESERIALIZATION_ERROR',
  COMPRESSION_ERROR = 'COMPRESSION_ERROR',
  DECOMPRESSION_ERROR = 'DECOMPRESSION_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INITIALIZATION_ERROR = 'INITIALIZATION_ERROR',
  INVALID_CONFIGURATION = 'INVALID_CONFIGURATION',
  OPERATION_FAILED = 'OPERATION_FAILED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  
  // Add missing error codes
  KEY_TOO_LONG = 'KEY_TOO_LONG',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  OPERATION_ERROR = 'OPERATION_ERROR',
  NO_PROVIDER = 'NO_PROVIDER',
  BATCH_ERROR = 'BATCH_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  TIMEOUT = 'TIMEOUT',
  DATA_INTEGRITY_ERROR = 'DATA_INTEGRITY_ERROR',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Cache error class
 */
export class CacheError extends Error {
  /**
   * Error code
   */
  code: CacheErrorCode;
  
  /**
   * Original error
   */
  cause?: Error;
  
  /**
   * Additional context
   */
  context?: Record<string, any>;
  
  /**
   * Create a new cache error
   * 
   * @param message - Error message
   * @param code - Error code
   * @param cause - Original error
   * @param context - Additional context
   */
  constructor(
    message: string,
    code: CacheErrorCode = CacheErrorCode.UNKNOWN_ERROR,
    cause?: Error,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'CacheError';
    this.code = code;
    this.cause = cause;
    this.context = context;
    
    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, CacheError);
    }
  }
}

/**
 * Create a cache error
 * 
 * @param message - Error message
 * @param code - Error code
 * @param cause - Original error
 * @param context - Additional context
 * @returns Cache error
 */
export function createCacheError(
  message: string,
  code: CacheErrorCode = CacheErrorCode.UNKNOWN_ERROR,
  cause?: Error,
  context?: Record<string, any>
): CacheError {
  return new CacheError(message, code, cause, context);
}

/**
 * Ensure an error is a proper Error object
 * 
 * @param error - Error to normalize
 * @returns Normalized error
 */
export function ensureError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  
  if (typeof error === 'string') {
    return new Error(error);
  }
  
  try {
    return new Error(JSON.stringify(error));
  } catch {
    return new Error('Unknown error');
  }
}

/**
 * Handle a cache error
 * 
 * @param error - Error to handle
 * @param context - Error context
 * @param throwError - Whether to throw the error
 * @returns Normalized error
 */
export function handleCacheError(
  error: unknown,
  context: Record<string, any> = {},
  throwError: boolean = false
): Error {
  const normalizedError = ensureError(error);
  
  // Log the error
  console.error(`Cache error: ${normalizedError.message}`, {
    context,
    stack: normalizedError.stack
  });
  
  // Throw if requested
  if (throwError) {
    throw normalizedError;
  }
  
  return normalizedError;
}