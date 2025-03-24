import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { CacheManagerCore } from '../implementations/cache-manager-core';
import { CacheOptions } from '../types/common';

// Create a default cache manager
const defaultCacheManager = new CacheManagerCore();

// Cache operation types
type CacheOperation = 
  | { type: 'get'; key: string }
  | { type: 'set'; key: string; value: any }
  | { type: 'delete'; key: string };

// Cache context type
interface CacheContextType {
  get: <T = any>(key: string) => Promise<T | null>;
  set: <T = any>(key: string, value: T, options?: CacheOptions) => Promise<void>;
  delete: (key: string) => Promise<boolean>;
  clear: () => Promise<void>;
  invalidateByPrefix: (prefix: string) => Promise<number>;
  invalidateByTag: (tag: string) => Promise<number>;
  batchOperations: (operations: CacheOperation[]) => Promise<void>;
  isLoading: boolean;
  error: Error | null;
}

// Create context with default values
const CacheContext = createContext<CacheContextType>({
  get: async () => null,
  set: async () => {},
  delete: async () => false,
  clear: async () => {},
  invalidateByPrefix: async () => 0,
  invalidateByTag: async () => 0,
  batchOperations: async () => {},
  isLoading: false,
  error: null,
});

// Provider props
interface CacheProviderProps {
  children: ReactNode;
  cacheManager?: CacheManagerCore;
}

// Cache provider component
export const CacheProvider: React.FC<CacheProviderProps> = ({ 
  children, 
  cacheManager = defaultCacheManager 
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Reset error when cache manager changes
  useEffect(() => {
    setError(null);
  }, [cacheManager]);

  // Get a value from cache
  const get = useCallback(async <T = any>(key: string): Promise<T | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const cached = await cacheManager.get(key) as T | null;
      return cached;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [cacheManager]);

  // Set a value in cache
  const set = useCallback(async <T = any>(
    key: string, 
    value: T, 
    options?: CacheOptions
  ): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Handle undefined values
      const newValue = value === undefined ? null : value;
      await cacheManager.set(key, newValue);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [cacheManager]);

  // Delete a value from cache
  const deleteValue = useCallback(async (key: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      return await cacheManager.delete(key);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [cacheManager]);

  // Perform batch operations
  const batchOperations = useCallback(async (operations: CacheOperation[]): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      
      for (const op of operations) {
        switch (op.type) {
          case 'get':
            await cacheManager.get(op.key);
            break;
          case 'set':
            await cacheManager.set(op.key, op.value);
            break;
          case 'delete':
            await cacheManager.delete(op.key);
            break;
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [cacheManager]);

  // Clear all values from cache
  const clear = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      await cacheManager.clear();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
    } finally {
      setIsLoading(false);
    }
  }, [cacheManager]);

  // Invalidate cache entries by tag
  const invalidateByTag = useCallback(async (tag: string): Promise<number> => {
    try {
      setIsLoading(true);
      setError(null);
      return await cacheManager.invalidateByTag(tag);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, [cacheManager]);

  // Invalidate cache entries by prefix
  const invalidateByPrefix = useCallback(async (prefix: string): Promise<number> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get keys matching prefix
      const keys = await cacheManager.keys(prefix);
      
      // Delete all matching keys
      const keysToDelete = keys.filter(key => key.startsWith(prefix));
      return Promise.all(keysToDelete.map(key => cacheManager.delete(key)))
        .then(results => results.filter(Boolean).length);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, [cacheManager]);

  // Create context value
  const contextValue = {
    get,
    set,
    delete: deleteValue,
    clear,
    invalidateByPrefix,
    invalidateByTag,
    batchOperations,
    isLoading,
    error,
  };

  return (
    <CacheContext.Provider value={contextValue}>
      {children}
    </CacheContext.Provider>
  );
};

// Hook to use cache context
export const useCache = () => useContext(CacheContext);

// Export default cache manager
export { defaultCacheManager };