/**
 * Circuit breaker implementation for cache operations
 */
import {EventEmitter} from 'events';
import { logger } from './logger';
import { metrics } from './metrics';

/**
 * Circuit breaker states
 */
export enum CircuitState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN'
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
export class CircuitBreaker extends EventEmitter {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private successCount: number = 0;
    private lastFailure: Date | null = null;
    private lastSuccess: Date | null = null;
    private openTime: Date | null = null;
    private resetTimer: NodeJS.Timeout | null = null;
    private monitorTimer: NodeJS.Timeout | null = null;
    private config: Required<CircuitBreakerConfig>;

    constructor(config: Partial<CircuitBreakerConfig> = {}) {
        super();

        // Set default config values
        this.config = {
            failureThreshold: 5,
            resetTimeout: 60000,
            halfOpenLimit: 1,
            trackSlowCalls: true,
            slowCallThreshold: 2000,
            enabled: true,
            ...config
        };

        // Start monitoring
        this.startMonitoring();
    }

    /**
     * Execute a function with circuit breaker protection
     *
     * @param fn - Function to execute
     * @param fallback - Fallback function to execute if circuit is open
     * @returns Result of function or fallback
     */
    async execute<T>(fn: () => Promise<T>, fallback?: () => Promise<T>): Promise<T> {
        if (!this.config.enabled) {
            return fn();
        }

        // Track metrics for circuit breaker state
        metrics.gauge('circuit_breaker.state', this.stateAsNumber(), {
            name: this.config.name || 'default'
        });

        if (this.isOpen()) {
            this.emit('rejected', { reason: 'circuit_open' });
            logger.debug('Circuit breaker rejected operation', {
                state: this.state,
                failures: this.failureCount
            });
            
            metrics.increment('circuit_breaker.rejected', 1, {
                name: this.config.name || 'default',
                reason: 'open'
            });
            
            if (fallback) {
                return fallback();
            }
            throw new Error(`Circuit breaker is open`);
        }

        const timerId = metrics.startTimer('circuit_breaker.execution');
        try {
            const result = await fn();
            this.recordSuccess();
            metrics.stopTimer(timerId, { result: 'success' });
            return result;
        } catch (error) {
            metrics.stopTimer(timerId, { result: 'failure' });
            return this.handleFailure(error as Error, fallback);
        }
    }
    
    /**
     * Record a failure without executing an operation
     */
    fail(): void {
        this.failureCount++;
        
        if (this.state === CircuitState.CLOSED && 
            this.failureCount >= this.config.failureThreshold) {
            this.openCircuit();
        }
        
        metrics.increment('circuit_breaker.failures', 1, {
            name: this.config.name || 'default'
        });
        
        this.emit('failure', {
            failureCount: this.failureCount,
            state: this.state
        });
    }
    
    /**
     * Convert circuit state to numeric value for metrics
     */
    private stateAsNumber(): number {
        switch (this.state) {
            case CircuitState.CLOSED:
                return 0;
            case CircuitState.HALF_OPEN:
                return 0.5;
            case CircuitState.OPEN:
                return 1;
            default:
                return -1;
        }
    }

    /**
     * Check if circuit is open
     *
     * @returns Whether circuit is open
     */
    isOpen(): boolean {
        return this.state === CircuitState.OPEN;
    }

    /**
     * Reset the circuit breaker
     */
    reset(): void {
        this.failureCount = 0;
        this.successCount = 0;
        this.setState(CircuitState.CLOSED);

        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }

        this.emit('reset');
    }

    /**
     * Clear all state and timers
     */
    clear(): void {
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailure = null;
        this.lastSuccess = null;
        this.openTime = null;

        if (this.resetTimer) {
            clearTimeout(this.resetTimer);
            this.resetTimer = null;
        }

        if (this.monitorTimer) {
            clearTimeout(this.monitorTimer);
            this.monitorTimer = null;
        }
    }

    /**
     * Get circuit breaker statistics
     *
     * @returns Circuit breaker stats
     */
    getStats(): any {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            lastFailure: this.lastFailure,
            lastSuccess: this.lastSuccess,
            openTime: this.openTime,
            uptime: this.getUptime()
        };
    }

    /**
     * Cleanup resources
     */
    destroy(): void {
        this.removeAllListeners();
        this.clear();
    }

    /**
     * Transition to half-open state
     *
     * @private
     */
    private halfOpen(): void {
        this.setState(CircuitState.HALF_OPEN);
        this.successCount = 0;
        this.emit('half-open');
    }

    /**
     * Record a successful operation
     *
     * @private
     */
    private recordSuccess(): void {
        this.successCount++;
        this.lastSuccess = new Date();

        // If in half-open state and success threshold reached, close circuit
        if (this.state === CircuitState.HALF_OPEN && this.successCount >= this.config.halfOpenLimit!) {
            this.setState(CircuitState.CLOSED);
        }

        this.emit('success', {
            successCount: this.successCount,
            state: this.state
        });
    }

    /**
     * Handle a failure
     *
     * @param error - Error that occurred
     * @param fallback - Fallback function
     * @private
     */
    private handleFailure(error: Error, fallback?: () => Promise<any>): Promise<any> {
        this.failureCount++;
        this.lastFailure = new Date();

        // If failure threshold reached, open circuit
        if (this.state === CircuitState.CLOSED && this.failureCount >= this.config.failureThreshold) {
            this.openCircuit();
        }

        this.emit('failure', {
            failureCount: this.failureCount,
            error,
            state: this.state
        });

        if (fallback) {
            return fallback();
        }

        throw error;
    }

    /**
     * Open the circuit
     *
     * @private
     */
    private openCircuit(): void {
        this.setState(CircuitState.OPEN);
        this.openTime = new Date();
        this.emit('open');

        // Schedule reset
        this.resetTimer = setTimeout(() => this.halfOpen(), this.config.resetTimeout);
    }

    /**
     * Set the circuit state
     *
     * @param state - New state
     * @private
     */
    private setState(state: CircuitState): void {
        this.state = state;

        if (state === CircuitState.CLOSED) {
            this.failureCount = 0;
            this.openTime = null;
            this.emit('close');
        }
    }

    /**
     * Start monitoring circuit breaker
     *
     * @private
     */
    private startMonitoring(): void {
        // Emit stats every 30 seconds
        this.monitorTimer = setInterval(() => {
            this.emit('stats', this.getStats());
        }, 30000);
    }

    /**
     * Get circuit breaker uptime in milliseconds
     *
     * @returns Uptime in milliseconds
     */
    private getUptime(): number {
        if (!this.lastSuccess) return 0;
        return Date.now() - this.lastSuccess.getTime();
    }
}

/**
 * Create a circuit breaker with the given config
 *
 * @param config - Circuit breaker config
 * @returns Circuit breaker instance
 */
export function createCircuitBreaker(config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    return new CircuitBreaker(config || {});
}