/**
 * @fileoverview Rate limiter implementation for cache operations
 * 
 * A token bucket algorithm implementation that controls the rate of operations
 * performed against cache services. This helps prevent overloading backend services
 * and ensures consistent performance during high traffic periods.
 * 
 * @module utils/rate-limiter
 */

import { CacheErrorCode, createCacheError } from './error-utils';

/**
 * Configuration options for the rate limiter
 * 
 * @interface RateLimiterOptions
 */
export interface RateLimiterOptions {
  /**
   * Maximum number of operations allowed in the specified time window
   * 
   * @type {number}
   * @example 100 - Allow 100 operations per window
   */
  limit: number;
  
  /**
   * Time window in milliseconds during which the limit applies
   * 
   * @type {number}
   * @example 60000 - Set a one minute window (60000ms)
   */
  window: number;
  
  /**
   * Controls whether to throw an error when rate limit is exceeded
   * If false, the limit method will return false instead
   * 
   * @type {boolean}
   * @default true
   */
  throwOnLimit?: boolean;
  
  /**
   * Strategy to use when rate limit is exceeded
   * - 'error': Throw an error or return false based on throwOnLimit
   * - 'wait': Wait until enough tokens are available
   * - 'reject': Immediately reject without waiting
   * 
   * @type {'error' | 'wait' | 'reject'}
   * @default 'error'
   */
  strategy?: 'error' | 'wait' | 'reject';
}

/**
 * Token bucket implementation for rate limiting cache operations
 * 
 * This class manages a virtual bucket of tokens that refill over time.
 * Each operation consumes one or more tokens, and operations are limited
 * when the bucket is empty.
 * 
 * @class RateLimiter
 */
export class RateLimiter {
  /**
   * Current number of tokens available in the bucket
   * @private
   */
  private tokens: number;
  
  /**
   * Timestamp of the last token refill
   * @private
   */
  private lastRefill: number;
  
  /**
   * Maximum capacity of the token bucket
   * @private
   */
  private readonly maxTokens: number;
  
  /**
   * Rate at which tokens are refilled (tokens per millisecond)
   * @private
   */
  private readonly refillRate: number;
  
  /**
   * Time window in milliseconds for token refill calculation
   * @private
   */
  private readonly refillInterval: number;
  
  /**
   * Whether to throw an error when rate limit is exceeded
   * @private
   */
  private readonly throwOnLimit: boolean;
  
  /**
   * Strategy to use when rate limit is exceeded
   * @private
   */
  private readonly strategy: 'error' | 'wait' | 'reject';
  
  /**
   * Creates a new rate limiter instance
   * 
   * @param {RateLimiterOptions} options - Configuration options for the rate limiter
   * 
   * @example
   * ```typescript
   * const limiter = new RateLimiter({
   *   limit: 100,
   *   window: 60000, // 1 minute
   *   strategy: 'wait'
   * });
   * ```
   */
  constructor(options: RateLimiterOptions) {
    this.maxTokens = options.limit;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    // Calculate tokens per ms
    this.refillRate = this.maxTokens / options.window;
    this.refillInterval = options.window;
    this.throwOnLimit = options.throwOnLimit ?? true;
    this.strategy = options.strategy ?? 'error';
  }
  
  /**
   * Attempt to consume tokens for an operation, handling rate limiting
   * according to the configured strategy
   * 
   * @param {string} operation - Name of the operation being limited
   * @param {number} cost - Number of tokens to consume for this operation
   * @returns {Promise<boolean>} True if operation is allowed, false if rejected
   * @throws {CacheError} If rate limit is exceeded and throwOnLimit is true
   * 
   * @example
   * ```typescript
   * // Check if operation can proceed
   * if (await limiter.limit('get', 1)) {
   *   // Perform operation
   * }
   * ```
   */
  async limit(operation: string, cost: number = 1): Promise<boolean> {
    this.refillTokens();
    
    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }
    
    // Handle rate limiting based on strategy
    switch (this.strategy) {
      case 'wait':
        const waitTime = this.calculateWaitTime(cost);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        this.refillTokens();
        this.tokens -= cost;
        return true;
        
      case 'reject':
        return false;
        
      case 'error':
      default:
        if (this.throwOnLimit) {
          throw createCacheError(
            `Rate limit exceeded for operation "${operation}"`,
            CacheErrorCode.RATE_LIMITED
          );
        }
        return false;
    }
  }
  
  /**
   * Get the current number of available tokens
   * 
   * @returns {number} Current token count
   */
  getTokens(): number {
    this.refillTokens();
    return this.tokens;
  }
  
  /**
   * Reset the token bucket to its full capacity
   * Useful after error conditions or service recovery
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }
  
  /**
   * Refill tokens based on elapsed time since last refill
   * 
   * @private
   */
  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    
    if (elapsed <= 0) {
      return;
    }
    
    // Calculate new tokens and add them
    const newTokens = elapsed * this.refillRate;
    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;
  }
  
  /**
   * Calculate the time to wait for enough tokens to be available
   * 
   * @param {number} cost - Number of tokens needed
   * @returns {number} Time to wait in milliseconds
   * @private
   */
  private calculateWaitTime(cost: number): number {
    const tokensNeeded = cost - this.tokens;
    return Math.ceil(tokensNeeded / this.refillRate);
  }
}

/**
 * Factory function to create a new rate limiter instance
 * 
 * @param {RateLimiterOptions} options - Configuration options for the rate limiter
 * @returns {RateLimiter} A configured rate limiter instance
 * 
 * @example
 * ```typescript
 * const limiter = createRateLimiter({
 *   limit: 100,
 *   window: 60000,
 *   strategy: 'wait'
   * });
   * ```
   */
  export function createRateLimiter(options: RateLimiterOptions): RateLimiter {
    return new RateLimiter(options);
  }
