/**
 * @fileoverview React context provider for cache management with
 * configuration and dependency injection.
 */

import React, {createContext, useContext, useMemo, useRef} from 'react';
import {CacheManagerCore} from '../implementations';
import {DEFAULT_CONFIG} from '../config/default-config';
import {ICacheProvider} from '../interfaces/cache-provider';

interface CacheContextValue {
  cacheManager: CacheManagerCore; // Make this required
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
  // Initialize cacheManager in useMemo to ensure stable reference
  const cacheManager = useMemo(() => {
    return new CacheManagerCore(config || DEFAULT_CONFIG);
  }, [config]);

  const contextValue = useMemo(() => ({
    cacheManager // This is now guaranteed to be defined
  }), [cacheManager]);

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
        const cached = await cacheManager.get(key) as T | null;
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
      // Process batch manually if not supported
      const results: any[] = [];
      // Execute operations sequentially
      for (const op of operations) {
        // Handle operations manually
        if (op.type === 'get') {
          await cacheManager.get(op.key);
        } else if (op.type === 'set') {
          await cacheManager.set(op.key, op.value);
        } else if (op.type === 'delete') {
          await cacheManager.delete(op.key);
        }
      }
      return results;
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
    
    invalidatePattern: React.useCallback((pattern: string) => {
      const keysToDelete = Array.from(pattern);
      return Promise.all(keysToDelete.map(key => cacheManager.delete(key)));
    }, [cacheManager]),
    
    clearAll: React.useCallback(() =>
      cacheManager.clear(), [cacheManager])
  };
}