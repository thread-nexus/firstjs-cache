import { CacheOptions, CacheStats, HealthStatus } from '../types/common';

export interface ICacheProvider {
  name: string;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
  healthCheck(): Promise<HealthStatus>;
  getMetadata?(key: string): Promise<Record<string, any> | null>;
  invalidateByTag?(tag: string): Promise<void>;
  getMany?<T>(keys: string[]): Promise<Record<string, T | null>>;
  setMany?<T>(entries: Record<string, T>, options?: CacheOptions): Promise<void>;
}
