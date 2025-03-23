"use strict";
/**
 * @fileoverview Error handling utilities for cache operations with detailed
 * error tracking, performance monitoring, and error recovery strategies.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = exports.CacheOperationError = exports.CacheProviderError = exports.CacheError = void 0;
exports.handleCacheError = handleCacheError;
exports.resetErrorTracking = resetErrorTracking;
exports.getErrorStats = getErrorStats;
exports.wrapWithErrorHandling = wrapWithErrorHandling;
const cache_events_1 = require("../events/cache-events");
const default_config_1 = require("../config/default-config");
// Error tracking for circuit breaker pattern
const errorTracker = new Map();
/**
 * Base cache error class with detailed metadata
 */
class CacheError extends Error {
    constructor(message, code, context, timestamp = new Date()) {
        super(message);
        this.code = code;
        this.context = context;
        this.timestamp = timestamp;
        this.name = 'CacheError';
    }
    /**
     * Convert error to JSON for logging
     */
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            code: this.code,
            context: this.context,
            timestamp: this.timestamp,
            stack: this.stack
        };
    }
}
exports.CacheError = CacheError;
/**
 * Provider-specific cache error
 */
class CacheProviderError extends CacheError {
    constructor(message, provider, context) {
        super(message, 'PROVIDER_ERROR', Object.assign({ provider }, context));
        this.provider = provider;
        this.name = 'CacheProviderError';
    }
}
exports.CacheProviderError = CacheProviderError;
/**
 * Operation-specific cache error
 */
class CacheOperationError extends CacheError {
    constructor(message, operation, context) {
        super(message, 'OPERATION_ERROR', Object.assign({ operation }, context));
        this.operation = operation;
        this.name = 'CacheOperationError';
    }
}
exports.CacheOperationError = CacheOperationError;
/**
 * Handle cache errors with circuit breaker pattern
 *
 * @param error - Error to handle
 * @param context - Error context
 * @param options - Error handling options
 * @throws {CacheError} If error threshold is exceeded
 *
 * @complexity Time: O(1)
 * @category Error Handling
 * @priority Critical
 */
function handleCacheError(error, context = {}, options = {}) {
    const { throwError = false, maxErrors = default_config_1.CACHE_CONSTANTS.MAX_ERRORS, errorWindow = default_config_1.CACHE_CONSTANTS.ERROR_WINDOW } = options;
    const key = context['provider'] || 'default';
    const now = new Date();
    // Update error tracking
    const tracking = errorTracker.get(key) || {
        count: 0,
        firstError: now,
        lastError: now
    };
    // Reset if outside error window
    if (now.getTime() - tracking.firstError.getTime() > errorWindow) {
        tracking.count = 1;
        tracking.firstError = now;
    }
    else {
        tracking.count++;
    }
    tracking.lastError = now;
    errorTracker.set(key, tracking);
    // Emit error event
    (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.ERROR, {
        error,
        context: Object.assign(Object.assign({}, context), { errorCount: tracking.count, errorWindow: errorWindow, maxErrors: maxErrors })
    });
    // Check circuit breaker
    if (tracking.count >= maxErrors) {
        const circuitError = new CacheError('Error threshold exceeded', 'CIRCUIT_OPEN', {
            provider: key,
            errorCount: tracking.count,
            errorWindow: errorWindow,
            firstError: tracking.firstError,
            lastError: tracking.lastError
        });
        (0, cache_events_1.emitCacheEvent)(cache_events_1.CacheEventType.ERROR, {
            error: circuitError,
            message: 'Circuit breaker opened'
        });
        throw circuitError;
    }
    // Throw original error if configured
    if (throwError) {
        throw error instanceof CacheError ? error : new CacheOperationError(error.message, context['operation'] || 'unknown', Object.assign({ originalError: error }, context));
    }
}
/**
 * Reset error tracking for a provider
 *
 * @param provider - Provider to reset
 *
 * @complexity Time: O(1)
 * @category Error Handling
 * @priority Medium
 */
function resetErrorTracking(provider) {
    if (provider) {
        errorTracker.delete(provider);
    }
    else {
        errorTracker.clear();
    }
}
/**
 * Get error statistics for monitoring
 *
 * @returns Error statistics by provider
 *
 * @complexity Time: O(n) where n is number of providers
 * @category Monitoring
 * @priority Low
 */
function getErrorStats() {
    const stats = {};
    for (const [provider, tracking] of errorTracker.entries()) {
        stats[provider] = Object.assign({}, tracking);
    }
    return stats;
}
/**
 * Create a wrapped function with error handling
 *
 * @param fn - Function to wrap
 * @param context - Error context
 * @param options - Error handling options
 * @returns Wrapped function
 *
 * @complexity Time: O(1)
 * @category Error Handling
 * @priority High
 *
 * @example
 * ```typescript
 * const safeFn = wrapWithErrorHandling(
 *   async () => await riskyOperation(),
 *   { operation: 'riskyOperation' }
 * );
 *
 * try {
 *   await safeFn();
 * } catch (error) {
 *   // Error is properly handled and tracked
 * }
 * ```
 */
function wrapWithErrorHandling(fn, context = {}, options = {}) {
    return function wrapped(...args) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield fn.apply(this, args);
            }
            catch (error) {
                handleCacheError(error, Object.assign(Object.assign({}, context), { arguments: args }), options);
                throw error;
            }
        });
    };
}
// Documentation metadata
exports.metadata = {
    category: types_1.DocCategory.ERROR_HANDLING,
    priority: 1 /* DocPriority.CRITICAL */,
    complexity: {
        time: 'O(1) for error handling, O(n) for stats',
        space: 'O(p) where p is number of providers',
        impact: types_1.PerformanceImpact.LOW,
        notes: 'Implements circuit breaker pattern for error protection'
    },
    examples: [{
            title: 'Basic Error Handling',
            code: `
      try {
        await cacheOperation();
      } catch (error) {
        handleCacheError(error, {
          operation: 'cacheOperation',
          provider: 'redis'
        });
      }
    `,
            description: 'Handle cache errors with tracking and circuit breaking'
        }],
    since: '1.0.0'
};
