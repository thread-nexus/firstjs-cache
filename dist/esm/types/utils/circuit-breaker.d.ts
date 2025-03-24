/**
 * Circuit breaker implementation for cache operations
 */
import { EventEmitter } from 'events';
/**
 * Circuit breaker states
 */
export declare enum CircuitState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
}
/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
    /**
     * Number of consecutive failures before opening circuit
     */
    failureThreshold: number;
    /**
     * Time in milliseconds to wait before trying to close circuit
     */
    resetTimeout: number;
    /**
     * Maximum number of requests allowed in half-open state
     */
    halfOpenLimit?: number;
    /**
     * Whether to track slow calls as failures
     */
    trackSlowCalls?: boolean;
    /**
     * Threshold in milliseconds for slow calls
     */
    slowCallThreshold?: number;
    /**
     * Whether to enable circuit breaker
     */
    enabled?: boolean;
}
/**
 * Circuit breaker implementation
 */
export declare class CircuitBreaker extends EventEmitter {
    private state;
    private failureCount;
    private successCount;
    private lastFailure;
    private lastSuccess;
    private openTime;
    private resetTimer;
    private monitorTimer;
    private config;
    constructor(config?: Partial<CircuitBreakerConfig>);
    /**
     * Execute a function with circuit breaker protection
     *
     * @param fn - Function to execute
     * @param fallback - Fallback function to execute if circuit is open
     * @returns Result of function or fallback
     */
    execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T>;
    /**
     * Check if circuit is open
     *
     * @returns Whether circuit is open
     */
    isOpen(): boolean;
    /**
     * Reset the circuit breaker
     */
    reset(): void;
    /**
     * Clear all state and timers
     */
    clear(): void;
    /**
     * Transition to half-open state
     *
     * @private
     */
    private halfOpen;
    /**
     * Record a successful operation
     *
     * @private
     */
    private recordSuccess;
    /**
     * Handle a failure
     *
     * @param error - Error that occurred
     * @param fallback - Fallback function
     * @private
     */
    private handleFailure;
    /**
     * Open the circuit
     *
     * @private
     */
    private openCircuit;
    /**
     * Set the circuit state
     *
     * @param state - New state
     * @private
     */
    private setState;
    /**
     * Start monitoring circuit breaker
     *
     * @private
     */
    private startMonitoring;
    /**
     * Get circuit breaker statistics
     *
     * @returns Circuit breaker stats
     */
    getStats(): any;
    /**
     * Get circuit breaker uptime in milliseconds
     *
     * @returns Uptime in milliseconds
     */
    private getUptime;
    /**
     * Clean up resources
     */
    destroy(): void;
}
/**
 * Create a circuit breaker with the given config
 *
 * @param config - Circuit breaker config
 * @returns Circuit breaker instance
 */
export declare function createCircuitBreaker(config?: Partial<CircuitBreakerConfig>): CircuitBreaker;
