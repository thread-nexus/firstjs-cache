/**
 * @fileoverview Enterprise-grade error handling utilities for cache operations
 * 
 * Provides a centralized system for handling, categorizing, enriching,
 * and reporting errors throughout the cache system.
 */

import { metrics } from './metrics';
import { logger, LogLevel } from './logger';
import { eventManager } from '../events/event-manager';
import { CacheEventType } from '../events/cache-events';

/**
 * Cache error severity levels
 */
export enum ErrorSeverity {
  /**
   * Low severity, operation can continue
   */
  LOW = 'low',
  
  /**
   * Medium severity, operation may be compromised
   */
  MEDIUM = 'medium',
  
  /**
   * High severity, operation cannot continue
   */
  HIGH = 'high',
  
  /**
   * Critical severity, system integrity is at risk
   */
  CRITICAL = 'critical'
}

/**
 * Error categories for classification
 */
export enum ErrorCategory {
  /**
   * Connection-related errors
   */
  CONNECTION = 'connection',
  
  /**
   * Authentication/authorization errors
   */
  AUTHENTICATION = 'authentication',
  
  /**
   * Data validity or format errors
   */
  VALIDATION = 'validation',
  
  /**
   * Timeout errors
   */
  TIMEOUT = 'timeout',
  
  /**
   * Quota or rate limiting errors
   */
  QUOTA = 'quota',
  
  /**
   * Resource not found errors
   */
  NOT_FOUND = 'not_found',
  
  /**
   * Dependency failure errors
   */
  DEPENDENCY = 'dependency',
  
  /**
   * Operational errors (e.g., network)
   */
  OPERATIONAL = 'operational',
  
  /**
   * Internal system errors
   */
  SYSTEM = 'system',
  
  /**
   * Unknown or uncategorized errors
   */
  UNKNOWN = 'unknown'
}

/**
 * Error code enumeration for standardized error handling
 */
export enum CacheErrorCode {
  // Connection errors (1000-1099)
  INVALID_ARGUMENT = 1000,
  NO_PROVIDER = 1000,
  INITIALIZATION_ERROR = 1000,
    CONNECTION_FAILED = 1000,
  CONNECTION_TIMEOUT = 1001,
  CONNECTION_CLOSED = 1002,
  CONNECTION_RESET = 1003,
  CONNECTION_REFUSED = 1004,
  CIRCUIT_OPEN = 1005,
  
  // Authentication errors (1100-1199)
  AUTHENTICATION_FAILED = 1100,
  AUTHORIZATION_FAILED = 1101,
  CREDENTIALS_INVALID = 1102,
  TOKEN_EXPIRED = 1103,
  
  // Validation errors (1200-1299)
  INVALID_KEY = 1200,
  INVALID_VALUE = 1201,
  INVALID_OPTIONS = 1202,
  KEY_TOO_LONG = 1203,
  VALUE_TOO_LARGE = 1204,
  
  // Timeout errors (1300-1399)
  OPERATION_TIMEOUT = 1300,
  LOCK_TIMEOUT = 1301,
  QUERY_TIMEOUT = 1302,
  
  // Quota errors (1400-1499)
  RATE_LIMITED = 1400,
  QUOTA_EXCEEDED = 1401,
  MEMORY_LIMIT = 1402,
  MAX_KEYS_REACHED = 1403,
  
  // Not found errors (1500-1599)
  KEY_NOT_FOUND = 1500,
  PROVIDER_NOT_FOUND = 1501,
  RESOURCE_NOT_FOUND = 1502,
  
  // Dependency errors (1600-1699)
  DEPENDENCY_FAILED = 1600,
  PROVIDER_ERROR = 1601,
  
  // Operational errors (1700-1799)
  NETWORK_ERROR = 1700,
  SERIALIZATION_ERROR = 1701,
  DESERIALIZATION_ERROR = 1702,
  CONFLICT = 1703,
  REPLICATION_ERROR = 1704,
  TIMEOUT = 1705,
  
  // System errors (1800-1899)
  INTERNAL_ERROR = 1800,
  NOT_IMPLEMENTED = 1801,
  UNAVAILABLE = 1802,
  OUT_OF_MEMORY = 1803,
  
  // Unknown errors (1900-1999)
  UNKNOWN_ERROR = 1900,
}

/**
 * Error fingerprinting options
 */
export interface ErrorFingerprintOptions {
  /**
   * Custom fingerprint components to include
   */
  includeComponents?: Array<keyof CacheError>;
  
  /**
   * Whether to include stack trace in fingerprint
   */
  includeStack?: boolean;
  
  /**
   * Number of stack frames to include if stack is included
   */
  stackFrameLimit?: number;
}

/**
 * Context for error handling
 */
export interface ErrorContext {
  /**
   * The operation being performed
   */
  operation?: string;
  
  /**
   * The cache provider name
   */
  provider?: string;
  
  /**
   * The cache key
   */
  key?: string;
  
  /**
   * Additional context data
   */
  [key: string]: any;
}

/**
 * Options for error processing
 */
export interface ErrorProcessingOptions {
  /**
   * Whether to log the error
   */
  log?: boolean;
  
  /**
   * Whether to emit an event for the error
   */
  emitEvent?: boolean;
  
  /**
   * Whether to track metrics for the error
   */
  trackMetrics?: boolean;
  
  /**
   * Custom error mapping function
   */
  mapError?: (error: Error, context?: ErrorContext) => CacheError;
  
  /**
   * Custom error enrichment function
   */
  enrichError?: (error: CacheError, context?: ErrorContext) => CacheError;
}

/**
 * Default error processing options
 */
const DEFAULT_ERROR_OPTIONS: ErrorProcessingOptions = {
  log: true,
  emitEvent: true,
  trackMetrics: true
};

/**
 * Standardized cache error with additional metadata
 */
export class CacheError extends Error {
  /**
   * Error code from CacheErrorCode enum
   */
  public readonly code: CacheErrorCode;
  
  /**
   * Error category for classification
   */
  public readonly category: ErrorCategory;
  
  /**
   * Error severity level
   */
  public readonly severity: ErrorSeverity;
  
  /**
   * Whether this error is retryable
   */
  public readonly retryable: boolean;
  
  /**
   * Whether this error has been handled
   */
  public handled: boolean = false;
  
  /**
   * Additional context for this error
   */
  public readonly context: ErrorContext;
  
  /**
   * Timestamp when the error occurred
   */
  public readonly timestamp: number;
  
  /**
   * Original error if this is a wrapped error
   */
  public readonly cause?: Error;
  
  /**
   * Operation attempted when the error occurred
   */
  public readonly operation?: string;
  
  /**
   * Provider involved when the error occurred
   */
  public readonly provider?: string;
  
  /**
   * Cache key involved when the error occurred
   */
  public readonly key?: string;
  
  /**
   * Unique fingerprint for this error
   */
  public readonly fingerprint: string;
  
  /**
   * Create a new CacheError
   * 
   * @param message Error message
   * @param code Error code
   * @param options Additional error options
   */
  constructor(
    message: string, 
    code: CacheErrorCode = CacheErrorCode.UNKNOWN_ERROR,
    options: {
      category?: ErrorCategory;
      severity?: ErrorSeverity;
      retryable?: boolean;
      context?: ErrorContext;
      cause?: Error;
      operation?: string;
      provider?: string;
      key?: string;
    } = {}
  ) {
    super(message);
    
    // Set error name to the class name
    this.name = this.constructor.name;
    
    // Assign properties
    this.code = code;
    this.category = options.category || this.getCategoryFromCode(code);
    this.severity = options.severity || this.getSeverityFromCode(code);
    this.retryable = options.retryable ?? this.isCodeRetryable(code);
    this.context = options.context || {};
    this.timestamp = Date.now();
    this.cause = options.cause;
    
    // Copy context properties to top level for easier access
    this.operation = options.operation || this.context.operation;
    this.provider = options.provider || this.context.provider;
    this.key = options.key || this.context.key;
    
    // Set error fingerprint
    this.fingerprint = this.generateFingerprint();
    
    // Ensure prototype is maintained for instanceof checks
    Object.setPrototypeOf(this, CacheError.prototype);
  }
  
  /**
   * Generate a unique fingerprint for this error
   */
  private generateFingerprint(options: ErrorFingerprintOptions = {}): string {
    const components = options.includeComponents || ['code', 'message', 'category'];
    const parts: string[] = [];
    
    // Add requested components
    for (const component of components) {
      if (this[component]) {
        parts.push(String(this[component]));
      }
    }
    
    // Add stack trace if requested
    if (options.includeStack && this.stack) {
      // Parse the stack trace and limit frames if needed
      const stackFrames = this.stack.split('\n').slice(1);
      const limitedFrames = options.stackFrameLimit 
        ? stackFrames.slice(0, options.stackFrameLimit) 
        : stackFrames;
      
      // Add cleaned stack frames to parts
      for (const frame of limitedFrames) {
        parts.push(frame.trim());
      }
    }
    
    // Generate fingerprint string
    return parts.join('|');
  }
  
  /**
   * Determine error category from error code
   */
  private getCategoryFromCode(code: CacheErrorCode): ErrorCategory {
    // Map code ranges to categories
    if (code >= 1000 && code < 1100) return ErrorCategory.CONNECTION;
    if (code >= 1100 && code < 1200) return ErrorCategory.AUTHENTICATION;
    if (code >= 1200 && code < 1300) return ErrorCategory.VALIDATION;
    if (code >= 1300 && code < 1400) return ErrorCategory.TIMEOUT;
    if (code >= 1400 && code < 1500) return ErrorCategory.QUOTA;
    if (code >= 1500 && code < 1600) return ErrorCategory.NOT_FOUND;
    if (code >= 1600 && code < 1700) return ErrorCategory.DEPENDENCY;
    if (code >= 1700 && code < 1800) return ErrorCategory.OPERATIONAL;
    if (code >= 1800 && code < 1900) return ErrorCategory.SYSTEM;
    
    return ErrorCategory.UNKNOWN;
  }
  
  /**
   * Determine error severity from error code
   */
  private getSeverityFromCode(code: CacheErrorCode): ErrorSeverity {
    // Assign severity based on category
    switch (this.getCategoryFromCode(code)) {
      case ErrorCategory.VALIDATION:
      case ErrorCategory.NOT_FOUND:
        return ErrorSeverity.LOW;
        
      case ErrorCategory.TIMEOUT:
      case ErrorCategory.QUOTA:
      case ErrorCategory.OPERATIONAL:
        return ErrorSeverity.MEDIUM;
        
      case ErrorCategory.CONNECTION:
      case ErrorCategory.AUTHENTICATION:
      case ErrorCategory.DEPENDENCY:
        return ErrorSeverity.HIGH;
        
      case ErrorCategory.SYSTEM:
        return ErrorSeverity.CRITICAL;
        
      default:
        return ErrorSeverity.MEDIUM;
    }
  }
  
  /**
   * Determine if an error code is retryable
   */
  private isCodeRetryable(code: CacheErrorCode): boolean {
    // Define retryable error codes
    const retryableCodes = [
      CacheErrorCode.CONNECTION_TIMEOUT,
      CacheErrorCode.CONNECTION_RESET,
      CacheErrorCode.OPERATION_TIMEOUT,
      CacheErrorCode.LOCK_TIMEOUT,
      CacheErrorCode.QUERY_TIMEOUT,
      CacheErrorCode.RATE_LIMITED,
      CacheErrorCode.NETWORK_ERROR,
      CacheErrorCode.UNAVAILABLE,
      CacheErrorCode.TIMEOUT
    ];
    
    return retryableCodes.includes(code);
  }
  
  /**
   * Convert error to a simple object for serialization
   */
  public toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      category: this.category,
      severity: this.severity,
      retryable: this.retryable,
      timestamp: this.timestamp,
      operation: this.operation,
      provider: this.provider,
      key: this.key,
      fingerprint: this.fingerprint,
      context: { ...this.context },
      cause: this.cause ? errorToObject(this.cause) : undefined
    };
  }
  
  /**
   * Mark error as handled
   */
  public markHandled(): CacheError {
    this.handled = true;
    return this;
  }
}

/**
 * Convert any error to a CacheError
 * 
 * @param error Original error
 * @param context Error context
 * @returns CacheError instance
 */
export function toCacheError(error: unknown, context: ErrorContext = {}): CacheError {
  if (error instanceof CacheError) {
    // If it's already a CacheError, just update context if needed
    return Object.keys(context).length > 0
      ? new CacheError(
          error.message,
          error.code,
          { 
            ...error,
            context: { ...error.context, ...context }
          }
        )
      : error;
  }
  
  // Handle Error instances
  if (error instanceof Error) {
    // Map known error types to appropriate codes
    const code = mapErrorToCode(error);
    
    return new CacheError(
      error.message,
      code,
      {
        cause: error,
        context
      }
    );
  }
  
  // Handle non-Error objects
  if (typeof error === 'object' && error !== null) {
    const message = (error as any).message || 'Unknown error';
    return new CacheError(
      message,
      CacheErrorCode.UNKNOWN_ERROR,
      {
        cause: new Error(message),
        context: {
          ...context,
          originalError: error
        }
      }
    );
  }
  
  // Handle primitive error values
  return new CacheError(
    String(error),
    CacheErrorCode.UNKNOWN_ERROR,
    { context }
  );
}

/**
 * Map an Error to an appropriate CacheErrorCode
 */
function mapErrorToCode(error: Error): CacheErrorCode {
  const errorName = error.name.toLowerCase();
  const errorMessage = error.message.toLowerCase();
  
  // Map common error types to codes
  if (errorName.includes('timeout') || errorMessage.includes('timeout')) {
    return CacheErrorCode.TIMEOUT;
  }
  
  if (errorName.includes('network') || errorMessage.includes('network')) {
    return CacheErrorCode.NETWORK_ERROR;
  }
  
  if (errorMessage.includes('not found') || errorMessage.includes('doesnt exist')) {
    return CacheErrorCode.KEY_NOT_FOUND;
  }
  
  if (errorMessage.includes('auth') || errorMessage.includes('permission')) {
    return CacheErrorCode.AUTHENTICATION_FAILED;
  }
  
  if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
    return CacheErrorCode.QUOTA_EXCEEDED;
  }
  
  if (errorMessage.includes('connect') || errorMessage.includes('connection')) {
    return CacheErrorCode.CONNECTION_FAILED;
  }
  
  // Default to unknown
  return CacheErrorCode.UNKNOWN_ERROR;
}

/**
 * Convert an error to a plain object
 */
function errorToObject(error: Error): Record<string, any> {
  const result: Record<string, any> = {
    name: error.name,
    message: error.message
  };
  
  // Include extra properties if available
  for (const key of Object.getOwnPropertyNames(error)) {
    if (key !== 'name' && key !== 'message') {
      const value = (error as any)[key];
      if (typeof value !== 'function') {
        result[key] = value;
      }
    }
  }
  
  return result;
}

/**
 * Create a new CacheError with the given message and code
 */
export function createCacheError(
  message: string,
  code: CacheErrorCode = CacheErrorCode.UNKNOWN_ERROR,
  context: ErrorContext = {}
): CacheError {
  return new CacheError(message, code, { context });
}

/**
 * Determine if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof CacheError) {
    return error.retryable;
  }
  
  // Convert to CacheError first to use its logic
  return toCacheError(error).retryable;
}

/**
 * Process an error with standardized handling
 * 
 * @param error The error to process
 * @param context Additional context
 * @param options Processing options
 * @returns CacheError instance
 */
export function handleCacheError(
  error: unknown,
  context: ErrorContext = {},
  options: ErrorProcessingOptions = DEFAULT_ERROR_OPTIONS
): CacheError {
  const mergedOptions = { ...DEFAULT_ERROR_OPTIONS, ...options };
  
  // Convert to CacheError if needed
  let cacheError: CacheError;
  
  if (mergedOptions.mapError) {
    // Use custom error mapping if provided
    cacheError = mergedOptions.mapError(
      error instanceof Error ? error : new Error(String(error)),
      context
    );
  } else {
    // Use default conversion
    cacheError = toCacheError(error, context);
  }
  
  // Apply custom enrichment if provided
  if (mergedOptions.enrichError) {
    cacheError = mergedOptions.enrichError(cacheError, context);
  }
  
  // Mark as handled to avoid duplicate processing
  cacheError.markHandled();
  
  // Log the error
  if (mergedOptions.log) {
    logError(cacheError);
  }
  
  // Emit error event
  if (mergedOptions.emitEvent) {
    emitErrorEvent(cacheError);
  }
  
  // Track error metrics
  if (mergedOptions.trackMetrics) {
    trackErrorMetrics(cacheError);
  }
  
  return cacheError;
}

/**
 * Log an error with the appropriate level
 */
function logError(error: CacheError): void {
  // Map severity to log level
  const levelMap: Record<ErrorSeverity, LogLevel> = {
    [ErrorSeverity.LOW]: LogLevel.INFO,
    [ErrorSeverity.MEDIUM]: LogLevel.WARN,
    [ErrorSeverity.HIGH]: LogLevel.ERROR,
    [ErrorSeverity.CRITICAL]: LogLevel.ERROR
  };
  
  const level = levelMap[error.severity] || LogLevel.ERROR;
  const context = {
    errorCode: error.code,
    errorCategory: error.category,
    provider: error.provider,
    operation: error.operation,
    key: error.key,
    fingerprint: error.fingerprint,
    ...error.context
  };
  
  // Log error with enriched context
  logger.info(`${error.name}: ${error.message}`, context);
}

/**
 * Emit an error event
 */
function emitErrorEvent(error: CacheError): void {
  eventManager.emit(
    CacheEventType.ERROR,
    {
      error,
      provider: error.provider,
      key: error.key,
      metadata: {
        code: error.code,
        category: error.category,
        severity: error.severity,
        operation: error.operation,
        context: error.context,
        fingerprint: error.fingerprint,
        retryable: error.retryable
      }
    },
    {
      logging: false, // Already logged separately
      recordInHistory: error.severity >= ErrorSeverity.HIGH, // Record high severity errors
      priority: error.severity === ErrorSeverity.CRITICAL ? 10 : 
                error.severity === ErrorSeverity.HIGH ? 8 : 
                error.severity === ErrorSeverity.MEDIUM ? 5 : 2
    }
  );
}

/**
 * Track error metrics
 */
function trackErrorMetrics(error: CacheError): void {
  // Increment error counter with tags
  metrics.increment('cache.errors', 1, {
    code: String(error.code),
    category: error.category,
    severity: error.severity,
    provider: error.provider || 'unknown',
    operation: error.operation || 'unknown',
    retryable: String(error.retryable)
  });
  
  // Track error rate for specific operations if available
  if (error.operation && error.provider) {
    metrics.increment(`cache.operation.${error.operation}.errors`, 1, {
      provider: error.provider,
      error_category: error.category
    });
  }
}

/**
 * Apply recovery strategies to handle an error
 * 
 * @param error The error to recover from
 * @param strategies Recovery strategies to try
 * @param context Additional context
 * @returns Recovery result
 */
export async function applyRecoveryStrategies<T>(
  error: unknown,
  strategies: Array<(error: CacheError, context: ErrorContext) => Promise<T | null>>,
  context: ErrorContext = {}
): Promise<T | null> {
  // Convert to CacheError
  const cacheError = toCacheError(error, context);
  
  // Try each strategy in order
  for (const strategy of strategies) {
    try {
      const result = await strategy(cacheError, context);
      if (result !== null) {
        // Strategy succeeded
        metrics.increment('cache.recovery.success', 1, {
          error_category: cacheError.category,
          provider: cacheError.provider || 'unknown'
        });
        return result;
      }
    } catch (strategyError) {
      // Strategy failed, try next one
      logger.debug('Recovery strategy failed', {
        strategy: strategy.name,
        error: strategyError instanceof Error ? strategyError.message : String(strategyError),
        originalError: cacheError.message
      });
    }
  }
  
  // All strategies failed
  metrics.increment('cache.recovery.failed', 1, {
    error_category: cacheError.category,
    provider: cacheError.provider || 'unknown'
  });
  
  return null;
}

/**
 * Common recovery strategies
 */
export const recoveryStrategies = {
  /**
   * Retry the operation with exponential backoff
   *
   * @param operation
   * @param maxRetries Maximum number of retries
   * @param baseDelay Base delay in milliseconds
   * @returns Recovery strategy function
   */
  retry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 300
  ): (error: CacheError) => Promise<T | null> {
    return async (error: CacheError): Promise<T | null> => {
      // Only retry if the error is retryable
      if (!error.retryable) {
        return null;
      }
      
      let lastError: Error | null = null;
      
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // Exponential backoff with jitter
          const delay = baseDelay * Math.pow(2, attempt) * (0.5 + Math.random() * 0.5);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Try the operation
          return await operation();
        } catch (retryError) {
          lastError = retryError instanceof Error ? retryError : new Error(String(retryError));
          
          // Log retry attempt
          logger.debug(`Retry attempt ${attempt + 1}/${maxRetries} failed`, {
            error: lastError.message,
            delay: baseDelay * Math.pow(2, attempt)
          });
        }
      }
      
      // All retries failed
      logger.warn(`All ${maxRetries} retry attempts failed`, {
        lastError: lastError?.message,
        originalError: error.message
      });
      
      return null;
    };
  },
  
  /**
   * Use a fallback value
   * 
   * @param fallbackValue Fallback value or function to generate it
   * @returns Recovery strategy function
   */
  fallbackValue<T>(
    fallbackValue: T | (() => Promise<T> | T)
  ): (error: CacheError) => Promise<T | null> {
    return async (): Promise<T | null> => {
      if (typeof fallbackValue === 'function') {
        return (fallbackValue as () => Promise<T> | T)() as Promise<T>;
      }
      return fallbackValue;
    };
  },
  
  /**
   * Try a fallback provider
   * 
   * @param providers Array of providers to try
   * @param operation Function that performs the operation with a provider
   * @returns Recovery strategy function
   */
  fallbackProvider<T>(
    providers: Array<any>,
    operation: (provider: any) => Promise<T>
  ): (error: CacheError) => Promise<T | null> {
    return async (error: CacheError): Promise<T | null> => {
      // Skip the current provider
      const currentProvider = error.provider;
      const remainingProviders = providers.filter(p => p.name !== currentProvider);
      
      if (remainingProviders.length === 0) {
        return null;
      }
      
      // Try each alternative provider
      for (const provider of remainingProviders) {
        try {
          logger.debug(`Trying fallback provider ${provider.name}`, {
            originalProvider: currentProvider,
            operation: error.operation
          });
          
          return await operation(provider);
        } catch (providerError) {
          logger.debug(`Fallback provider ${provider.name} failed`, {
            error: providerError instanceof Error ? providerError.message : String(providerError)
          });
        }
      }
      
      return null;
    };
  }
};
