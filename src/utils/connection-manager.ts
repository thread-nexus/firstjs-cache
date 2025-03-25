/**
 * @fileoverview Connection manager for cache providers
 * 
 * This utility handles connection management, retries, and circuit breaking
 * for cache providers, ensuring robust operation even during transient failures.
 */

import { CircuitBreaker } from './circuit-breaker';
import { CacheErrorCode, createCacheError, isRetryableError } from './error-handling';
import { CacheEventType } from '../events/cache-events';
import { eventManager } from '../events/event-manager';

/**
 * Connection options
 */
export interface ConnectionOptions {
  /**
   * Maximum retry attempts
   */
  maxRetries?: number;
  
  /**
   * Base delay between retries in milliseconds
   */
  retryDelay?: number;
  
  /**
   * Maximum delay between retries in milliseconds
   */
  maxRetryDelay?: number;
  
  /**
   * Whether to use exponential backoff for retries
   */
  exponentialBackoff?: boolean;
  
  /**
   * Jitter factor for retry delays (0-1)
   */
  jitter?: number;
  
  /**
   * Connection timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to use circuit breaker
   */
  circuitBreaker?: boolean;
  
  /**
   * Circuit breaker failure threshold
   */
  breakerThreshold?: number;
  
  /**
   * Circuit breaker reset timeout in milliseconds
   */
  breakerResetTimeout?: number;
}

/**
 * Default connection options
 */
const DEFAULT_OPTIONS: ConnectionOptions = {
  maxRetries: 3,
  retryDelay: 100,
  maxRetryDelay: 5000,
  exponentialBackoff: true,
  jitter: 0.1,
  timeout: 5000,
  circuitBreaker: true,
  breakerThreshold: 5,
  breakerResetTimeout: 30000
};

/**
 * Connection state
 */
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

/**
 * Connection manager for cache providers
 */
export class ConnectionManager {
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private connectionAttempts = 0;
  private lastError: Error | null = null;
  private connectPromise: Promise<boolean> | null = null;
  private readonly options: Required<ConnectionOptions>;
  private readonly breaker: CircuitBreaker;
  private connectionTimers: NodeJS.Timeout[] = [];
  
  /**
   * Create a new connection manager
   * 
   * @param name Connection name for logging and events
   * @param options Connection options
   */
  constructor(
    private readonly name: string,
    options: ConnectionOptions = {}
  ) {
    this.options = { ...DEFAULT_OPTIONS, ...options } as Required<ConnectionOptions>;
    
    // Initialize circuit breaker if enabled
    this.breaker = new CircuitBreaker({
      failureThreshold: this.options.breakerThreshold,
      resetTimeout: this.options.breakerResetTimeout,
      enabled: this.options.circuitBreaker
    });
    
    // Listen for circuit breaker events
    this.breaker.on('open', () => this.emitEvent('circuit_open'));
    this.breaker.on('close', () => this.emitEvent('circuit_closed'));
    this.breaker.on('half-open', () => this.emitEvent('circuit_half_open'));
  }
  
  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }
  
  /**
   * Get last connection error
   */
  getLastError(): Error | null {
    return this.lastError;
  }
  
  /**
   * Connect with retry logic
   * 
   * @param connectFn Function that establishes the connection
   * @returns Whether connection was successful
   */
  async connect(connectFn: () => Promise<boolean>): Promise<boolean> {
    // If already connecting, return existing promise
    if (this.connectPromise) {
      return this.connectPromise;
    }
    
    // If circuit is open, fail fast
    if (this.breaker.isOpen()) {
      throw createCacheError(
        `Circuit breaker is open for ${this.name}`,
        CacheErrorCode.CIRCUIT_OPEN,
        { provider: this.name }
      );
    }
    
    // Begin connection process
    this.setState(ConnectionState.CONNECTING);
    this.connectionAttempts = 0;
    
    // Create and store the connection promise
    this.connectPromise = this.executeWithRetry(async () => {
      const result = await this.executeWithTimeout(
        connectFn,
        this.options.timeout
      );
      
      if (result) {
        this.setState(ConnectionState.CONNECTED);
        this.breaker.reset();
      } else {
        this.setState(ConnectionState.FAILED);
        this.breaker.fail();
      }
      
      return result;
    });
    
    try {
      return await this.connectPromise;
    } finally {
      this.connectPromise = null;
    }
  }
  
  /**
   * Execute an operation with circuit breaker protection
   *
   * @param fn Operation function
   * @param fallback
   * @returns Operation result
   */
  async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
    return this.breaker.execute(fn, fallback);
  }
  
  /**
   * Reconnect after a failure
   * 
   * @param connectFn Function that establishes the connection
   * @returns Whether reconnection was successful
   */
  async reconnect(connectFn: () => Promise<boolean>): Promise<boolean> {
    // Clear any existing reconnection timers
    this.clearTimers();
    
    this.setState(ConnectionState.RECONNECTING);
    
    try {
      return await this.connect(connectFn);
    } catch (error) {
      this.setState(ConnectionState.FAILED);
      throw error;
    }
  }
  
  /**
   * Schedule a reconnection attempt after a delay
   * 
   * @param connectFn Function that establishes the connection
   * @param delay Delay in milliseconds
   * @returns Promise that resolves when reconnection is attempted
   */
  async scheduleReconnect(
    connectFn: () => Promise<boolean>,
    delay: number = this.options.retryDelay
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const timer = setTimeout(async () => {
        try {
          const result = await this.reconnect(connectFn);
          resolve(result);
        } catch (error) {
          resolve(false);
        }
      }, delay);
      
      this.connectionTimers.push(timer);
    });
  }
  
  /**
   * Disconnect and clean up resources
   */
  disconnect(): void {
    this.clearTimers();
    this.setState(ConnectionState.DISCONNECTED);
    this.connectPromise = null;
  }
  
  /**
   * Reset the connection manager
   */
  reset(): void {
    this.disconnect();
    this.connectionAttempts = 0;
    this.lastError = null;
    this.breaker.reset();
  }
  
  /**
   * Execute a function with retry logic
   * 
   * @param fn Function to execute
   * @returns Function result
   */
  private async executeWithRetry<T>(fn: () => Promise<T>): Promise<T> {
    let delay = this.options.retryDelay;
    
    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        // First attempt or subsequent retry
        if (attempt > 0) {
          this.emitEvent('retry', { attempt, delay });
        }
        
        return await fn();
      } catch (error) {
        this.lastError = error instanceof Error ? error : new Error(String(error));
        this.connectionAttempts++;
        
        // Check if we've exhausted retries
        if (attempt >= this.options.maxRetries || !isRetryableError(error)) {
          this.setState(ConnectionState.FAILED);
          this.breaker.fail();
          throw error;
        }
        
        // Calculate next delay with exponential backoff and jitter
        if (this.options.exponentialBackoff) {
          delay = Math.min(
            delay * 2,
            this.options.maxRetryDelay
          );
        }
        
        // Add jitter
        if (this.options.jitter > 0) {
          const jitterAmount = delay * this.options.jitter;
          delay = delay - (jitterAmount / 2) + (Math.random() * jitterAmount);
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // This should be unreachable due to the throw in the loop
    throw new Error(`Failed after ${this.options.maxRetries} attempts`);
  }
  
  /**
   * Execute a function with a timeout
   * 
   * @param fn Function to execute
   * @param timeout Timeout in milliseconds
   * @returns Function result
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(createCacheError(
          `Operation timed out after ${timeout}ms`,
          CacheErrorCode.OPERATION_TIMEOUT,
          { provider: this.name }
        ));
      }, timeout);
      
      // Execute function
      fn().then(
        result => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        error => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    });
  }
  
  /**
   * Update connection state and emit event
   * 
   * @param state New state
   */
  private setState(state: ConnectionState): void {
    if (this.state === state) {
      return;
    }
    
    const previousState = this.state;
    this.state = state;
    
    this.emitEvent('state_change', { 
      previous: previousState,
      current: state
    });
  }
  
  /**
   * Emit connection event
   * 
   * @param event Event type
   * @param data Event data
   */
  private emitEvent(event: string, data: Record<string, any> = {}): void {
    try {
      eventManager.emit(CacheEventType.CONNECTION, {
        metadata: {
          provider: this.name,
          connection: event,
          state: this.state,
          timestamp: Date.now(),
          attempts: this.connectionAttempts,
          ...data
        }
      });
    } catch (error) {
      // Suppress errors from event emission
      console.debug('Error emitting connection event:', error);
    }
  }
  
  /**
   * Clear all connection timers
   */
  private clearTimers(): void {
    for (const timer of this.connectionTimers) {
      clearTimeout(timer);
    }
    this.connectionTimers = [];
  }
}

/**
 * Create a connection manager
 * 
 * @param name Connection name
 * @param options Connection options
 * @returns Connection manager
 */
export function createConnectionManager(
  name: string,
  options?: ConnectionOptions
): ConnectionManager {
  return new ConnectionManager(name, options);
}
