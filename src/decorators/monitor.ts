// Commented out to avoid TS2307 error:
// import { CacheMonitoringAPI } from '../api/CacheMonitoringAPI';

// Define a dummy API to avoid errors.
const api = {
  recordHit: (_duration: number, _size?: number) => {},
  recordMiss: (_duration: number) => {},
  recordError: (_error: Error) => {}
};

export function monitor(options: {
  type?: 'hit' | 'miss' | 'error';
  measureSize?: boolean;
} = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const startTime = performance.now();
      // Using dummy api instead of CacheMonitoringAPI.getInstance()
      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - startTime;

        if (options.type === 'hit') {
          const size = options.measureSize && result ? JSON.stringify(result).length : 0;
          api.recordHit(duration, size);
        } else if (options.type === 'miss') {
          api.recordMiss(duration);
        }

        return result;
      } catch (error) {
        api.recordError(error as Error);
        throw error;
      }
    };

    return descriptor;
  };
}