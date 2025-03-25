/**
 * @fileoverview Utilities for safely working with provider methods
 * 
 * These utilities provide a consistent way to check for and call methods
 * on cache providers, with proper error handling and type safety.
 */

import { ICacheProvider } from '../interfaces/i-cache-provider';
import { handleCacheError } from './error-handling';
import { logger } from './logger';

/**
 * Check if a provider implements a specific method
 * 
 * @param provider The cache provider to check
 * @param methodName The method name to check for
 * @returns Whether the provider implements the method
 */
export function hasProviderMethod(
  provider: any, 
  methodName: string | symbol
): boolean {
  return provider && typeof provider[methodName] === 'function';
}

/**
 * Safely call a provider method with error handling
 *
 * @param provider The cache provider
 * @param methodName The method to call
 * @param context
 * @param args Arguments to pass to the method
 * @returns The result of the method call or null if not available
 */
export async function callProviderMethod<T>(
  provider: any,
  methodName: string | symbol,
  context: { providerName: string },
  ...args: any[]
): Promise<T | null> {
  if (!hasProviderMethod(provider, methodName)) {
    logger.debug(`Provider ${context.providerName} does not implement method ${String(methodName)}`);
    return null;
  }

  try {
    return await provider[methodName](...args);
  } catch (error) {
    handleCacheError(error, {
      operation: String(methodName),
      provider: context.providerName
    });
    throw error; // Re-throw to allow caller to handle
  }
}

/**
 * Safely call a provider method with error handling but don't throw
 *
 * @param provider The cache provider
 * @param methodName The method to call
 * @param context
 * @param args Arguments to pass to the method
 * @returns The result of the method call or null if error or not available
 */
export async function trySafeProviderMethod<T>(
  provider: any,
  methodName: string | symbol,
  context: { providerName: string },
  ...args: any[]
): Promise<T | null> {
  if (!hasProviderMethod(provider, methodName)) {
    return null;
  }

  try {
    return await provider[methodName](...args);
  } catch (error) {
    handleCacheError(error, {
      operation: String(methodName),
      provider: context.providerName
    });
    return null;
  }
}

/**
 * Get health check for a provider
 * 
 * @param provider The cache provider
 * @param providerName Provider name for context
 * @returns Health status or a default status if not implemented
 */
export async function getProviderHealth(
  provider: any, 
  providerName: string
): Promise<{
  healthy: boolean;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  lastCheck: number;
}> {
  const defaultHealth = {
    healthy: true,
    status: 'healthy' as const,
    message: 'Health check not implemented by provider',
    lastCheck: Date.now()
  };

  if (!hasProviderMethod(provider, 'healthCheck')) {
    return defaultHealth;
  }

  try {
    const health = await provider.healthCheck();
    return {
      ...defaultHealth,
      ...health,
      lastCheck: Date.now()
    };
  } catch (error) {
    handleCacheError(error, {
      operation: 'healthCheck',
      provider: providerName
    });
    
    return {
      healthy: false,
      status: 'unhealthy',
      message: error instanceof Error ? error.message : String(error),
      lastCheck: Date.now()
    };
  }
}
