/**
 * @fileoverview Error utilities for cache operations
 * 
 * This module has been updated to leverage the centralized error handling system.
 */

import { 
  CacheErrorCode, 
  CacheError, 
  ErrorContext,
  handleCacheError as processError,
  createCacheError,
  isRetryableError as checkRetryable,
  applyRecoveryStrategies,
  recoveryStrategies
} from './error-handling';

// Re-export from error-handling
export { 
  CacheErrorCode, 
  CacheError, 
  ErrorContext,
  ErrorSeverity,
  ErrorCategory,
  createCacheError,
  isRetryableError,
  applyRecoveryStrategies,
  recoveryStrategies
} from './error-handling';

/**
 * Handle a cache error with standard error processing
 *
 * @param error The error to handle
 * @param context Additional context
 * @param p0
 * @returns Processed CacheError
 */
export function handleCacheError(error: unknown, context: ErrorContext = {}, p0: boolean): CacheError {
  return processError(error, context);
}

/**
 * Helper function to wrap operations with error handling
 * 
 * @param operation Function to execute
 * @param context Error context
 * @param defaultValue Default value to return on error
 * @returns Operation result or default value
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {},
  defaultValue?: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const cacheError = handleCacheError(error, context);
    
    if (defaultValue !== undefined) {
      return defaultValue;
    }
    
    throw cacheError;
  }
}

/**
 * Retry an operation with error handling
 * 
 * @param operation Function to execute
 * @param context Error context
 * @param maxRetries Maximum retry attempts
 * @param baseDelay Base delay between retries in ms
 * @returns Operation result
 */
export async function retryWithErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext = {},
  maxRetries: number = 3,
  baseDelay: number = 300
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    const cacheError = handleCacheError(error, context);
    
    // Try recovery with retry strategy
    const result = await applyRecoveryStrategies(
      cacheError,
      [recoveryStrategies.retry(operation, maxRetries, baseDelay)],
      context
    );
    
    if (result !== null) {
      return result;
    }
    
    // No recovery was possible
    throw cacheError;
  }
}