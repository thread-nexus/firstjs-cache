import { CacheManagerStats } from '../../src/implementations/cache-manager-stats';

describe('CacheManagerStats', () => {
  let stats: CacheManagerStats;

  beforeEach(() => {
    stats = new CacheManagerStats();
  });

  test('should record operation timing', () => {
    stats.recordOperation('get', 100);
    const metrics = stats.getOperationMetrics('get');

    expect(metrics).toBeDefined();
    expect(metrics?.count).toBe(1);
    expect(metrics?.totalTime).toBe(100);
  });

  test('should calculate average operation time', () => {
    stats.recordOperation('get', 100);
    stats.recordOperation('get', 200);

    const avgTime = stats.getAverageOperationTime('get');
    expect(avgTime).toBe(150);
  });

  test('should track hits and misses', () => {
    stats.recordHit(50);
    stats.recordMiss(30);

    expect(stats.getStats().hits).toBe(1);
    expect(stats.getStats().misses).toBe(1);
    expect(stats.getStats().hitRate).toBe(0.5);
  });

  test('should reset statistics', () => {
    stats.recordHit(50);
    stats.recordOperation('get', 100);

    stats.reset();

    expect(stats.getStats().hits).toBe(0);
    expect(stats.getOperationMetrics('get')?.count).toBe(0);
  });
});
