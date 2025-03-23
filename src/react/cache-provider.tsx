/**
 * @fileoverview React context provider for cache management with
 * configuration and dependency injection.
 */

import React, {createContext, useContext, useMemo, useRef} from 'react';
import {CacheManagerCore} from '../implementations';
import {DEFAULT_CONFIG} from '../config/default-config';
import {ICacheProvider} from '../interfaces/cache-provider';

interface CacheContextValue {
  cacheManager: CacheManagerCore;
}

const CacheContext = createContext<CacheContextValue | null>(null);

interface CacheProviderProps {
  children: React.ReactNode;
  config?: typeof DEFAULT_CONFIG;
  providers?: Array<{
    name: string;
    instance: ICacheProvider;
    priority?: number;
  }>;
}

/**
 * Cache context provider component
 */
export function CacheProvider({ 
  children, 
  config,
  providers = []
}: CacheProviderProps) {
  // Create cache manager instance
  const cacheManagerRef = useRef<CacheManagerCore>();
  if (!cacheManagerRef.current) {
    cacheManagerRef.current = new CacheManagerCore(config);
    
    // Register providers
    providers.forEach(({ name, instance, priority }) => {
      cacheManagerRef.current!.registerProvider(name, instance, priority);
    });
  }

  const contextValue = useMemo(() => ({
    cacheManager: cacheManagerRef.current
  }), []);

  return (
    <CacheContext.Provider value={contextValue}>
      {children}
    </CacheContext.Provider>
  );
}

/**
 * Hook to access cache manager
 */
export function useCacheManager() {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCacheManager must be used within a CacheProvider');
  }
  return context.cacheManager;
}

/**
 * Hook to access cache value
 */
export function useCacheValue<T>(key: string, initialValue?: T) {
  const cacheManager = useCacheManager();
  const [value, setValue] = React.useState<T | null>(initialValue || null);
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load initial value
  React.useEffect(() => {
    let mounted = true;

    async function loadValue() {
      try {
        const cached = await cacheManager.get<T>(key);
        if (mounted) {
          setValue(cached);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadValue().then(r => {});

    return () => {
      mounted = false;
    };
  }, [key, cacheManager]);

  // Update value
  const updateValue = React.useCallback(async (newValue: T) => {
    try {
      await cacheManager.set(key, newValue);
      setValue(newValue);
      setError(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  }, [key, cacheManager]);

  return {
    value,
    error,
    isLoading,
    setValue: updateValue
  };
}

/**
 * Hook for batch operations
 */
export function useCacheBatch() {
  const cacheManager = useCacheManager();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const executeBatch = React.useCallback(async <T,>(
    operations: Array<{
      type: 'get' | 'set' | 'delete';
      key: string;
      value?: T;
    }>
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      return await cacheManager.batch(operations);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [cacheManager]);

  return {
    executeBatch,
    isLoading,
    error
  };
}

/**
 * Hook for cache invalidation
 */
export function useCacheInvalidation() {
  const cacheManager = useCacheManager();

  return {
    invalidateKey: React.useCallback((key: string) => 
      cacheManager.delete(key), [cacheManager]),
    
    invalidatePattern: React.useCallback((pattern: string) =>
      cacheManager.batch(
        Array.from(pattern).map(key => ({
          type: 'delete' as const,
          key
        }))
      ), [cacheManager]),
    
    clearAll: React.useCallback(() =>
      cacheManager.clear(), [cacheManager])
  };
}