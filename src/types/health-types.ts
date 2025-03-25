/**
 * @fileoverview Health status types for the cache system
 */

/**
 * Health status codes
 */
export enum HealthStatusCode {
  /**
   * System is healthy
   */
  HEALTHY = 'healthy',
  
  /**
   * System is degraded but still functional
   */
  DEGRADED = 'degraded',
  
  /**
   * System is unhealthy and not functional
   */
  UNHEALTHY = 'unhealthy',
  
  /**
   * Health status is unknown
   */
  UNKNOWN = 'unknown'
}

/**
 * Health check information for a component
 */
export interface HealthStatus {
  /**
   * Health status code
   */
  status: HealthStatusCode | string;
  
  /**
   * Whether the component is healthy
   */
  healthy: boolean;
  
  /**
   * When the health check was performed
   */
  timestamp: number;
  
  /**
   * When the last check was performed
   */
  lastCheck: number;
  
  /**
   * Error message if unhealthy
   */
  error?: string;
  
  /**
   * Detailed information
   */
  details?: Record<string, any>;
}

/**
 * Health status for the cache system
 */
export interface CacheHealthStatus {
  /**
   * Overall health status
   */
  status: HealthStatusCode | string;
  
  /**
   * Whether the cache is healthy
   */
  healthy: boolean;
  
  /**
   * When the health check was performed
   */
  timestamp: number;
  
  /**
   * Health status for each provider
   */
  providers: Record<string, HealthStatus>;
  
  /**
   * Additional details
   */
  details?: Record<string, any>;
}

/**
 * Health status by component
 */
export interface ComponentHealth {
  /**
   * Component name
   */
  component: string;
  
  /**
   * Health status
   */
  status: HealthStatusCode | string;
  
  /**
   * Whether the component is healthy
   */
  healthy: boolean;
  
  /**
   * Error message if unhealthy
   */
  error?: string;
  
  /**
   * Additional details
   */
  details?: Record<string, any>;
}

/**
 * Health check options
 */
export interface HealthCheckOptions {
  /**
   * Timeout in milliseconds
   */
  timeout?: number;
  
  /**
   * Whether to check all components
   */
  checkAll?: boolean;
  
  /**
   * Whether to include details in the response
   */
  includeDetails?: boolean;
}