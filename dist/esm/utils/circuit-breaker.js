/**
 * Circuit breaker implementation for cache operations
 */
import { EventEmitter } from 'events';
/**
 * Circuit breaker states
 */
export var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "CLOSED";
    CircuitState["OPEN"] = "OPEN";
    CircuitState["HALF_OPEN"] = "HALF_OPEN";
})(CircuitState || (CircuitState = {}));
/**
 * Circuit breaker implementation
 */
export class CircuitBreaker extends EventEmitter {
    constructor(config = {}) {
        super();
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.lastFailure = null;
        this.lastSuccess = null;
        this.openTime = null;
        this.resetTimer = null;
        this.monitorTimer = null;
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
    async execute(fn, fallback) {
        if (!this.config.enabled) {
            return fn();
        }
        if (this.isOpen()) {
            if (fallback) {
                return fallback();
            }
            throw new Error(`Circuit breaker is open`);
        }
        try {
            const result = await fn();
            this.recordSuccess();
            return result;
        }
        catch (error) {
            return this.handleFailure(error, fallback);
        }
    }
    /**
     * Check if circuit is open
     *
     * @returns Whether circuit is open
     */
    isOpen() {
        return this.state === CircuitState.OPEN;
    }
    /**
     * Reset the circuit breaker
     */
    reset() {
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
    clear() {
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
     * Transition to half-open state
     *
     * @private
     */
    halfOpen() {
        this.setState(CircuitState.HALF_OPEN);
        this.successCount = 0;
        this.emit('half-open');
    }
    /**
     * Record a successful operation
     *
     * @private
     */
    recordSuccess() {
        this.successCount++;
        this.lastSuccess = new Date();
        // If in half-open state and success threshold reached, close circuit
        if (this.state === CircuitState.HALF_OPEN && this.successCount >= this.config.halfOpenLimit) {
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
    handleFailure(error, fallback) {
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
    openCircuit() {
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
    setState(state) {
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
    startMonitoring() {
        // Emit stats every 30 seconds
        this.monitorTimer = setInterval(() => {
            this.emit('stats', this.getStats());
        }, 30000);
    }
    /**
     * Get circuit breaker statistics
     *
     * @returns Circuit breaker stats
     */
    getStats() {
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
     * Get circuit breaker uptime in milliseconds
     *
     * @returns Uptime in milliseconds
     */
    getUptime() {
        if (!this.lastSuccess)
            return 0;
        return Date.now() - this.lastSuccess.getTime();
    }
    /**
     * Clean up resources
     */
    destroy() {
        this.removeAllListeners();
        this.clear();
    }
}
/**
 * Create a circuit breaker with the given config
 *
 * @param config - Circuit breaker config
 * @returns Circuit breaker instance
 */
export function createCircuitBreaker(config) {
    return new CircuitBreaker(config || {});
}
//# sourceMappingURL=circuit-breaker.js.map