import { RedisThrottlerStorage } from './redis-throttler.storage';

describe('RedisThrottlerStorage', () => {
  it('uses the shared Redis counter when available', async () => {
    const redis = { throttleIncrement: jest.fn(async () => ({ totalHits: 5, timeToExpire: 42 })) };
    const storage = new RedisThrottlerStorage(redis as any);

    const record = await storage.increment('1.2.3.4', 60000);

    expect(record).toEqual({ totalHits: 5, timeToExpire: 42 });
    expect(redis.throttleIncrement).toHaveBeenCalledWith('throttle:1.2.3.4', 60000);
  });

  it('falls back to per-instance counting when Redis is down', async () => {
    const redis = { throttleIncrement: jest.fn(async () => null) };
    const storage = new RedisThrottlerStorage(redis as any);

    const first = await storage.increment('1.2.3.4', 60000);
    const second = await storage.increment('1.2.3.4', 60000);

    expect(first.totalHits).toBe(1);
    expect(second.totalHits).toBe(2);
  });
});
