import { RedisService } from './redis.service';

// ConfigService stub with no Redis host → service starts in degraded mode
// (client null, available false), which is the single-instance / dev path.
const noRedisConfig = { get: () => undefined } as any;

describe('RedisService.runExclusive', () => {
  it('runs the work and reports success when Redis is unavailable', async () => {
    const service = new RedisService(noRedisConfig);
    const fn = jest.fn(async () => {});
    const ran = await service.runExclusive('cron-lock:job', 1000, fn);
    expect(ran).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('runs and releases the lock when acquired', async () => {
    const service = new RedisService(noRedisConfig);
    const client = { set: jest.fn(async () => 'OK'), eval: jest.fn(async () => 1) };
    (service as any).client = client;
    (service as any).available = true;

    const fn = jest.fn(async () => {});
    const ran = await service.runExclusive('cron-lock:job', 1000, fn);

    expect(ran).toBe(true);
    expect(fn).toHaveBeenCalledTimes(1);
    // NX + PX so only one instance wins, and a compare-and-delete on release.
    expect(client.set).toHaveBeenCalledWith('cron-lock:job', expect.any(String), 'PX', 1000, 'NX');
    expect(client.eval).toHaveBeenCalledTimes(1);
  });

  it('skips the work when another instance holds the lock', async () => {
    const service = new RedisService(noRedisConfig);
    const client = { set: jest.fn(async () => null), eval: jest.fn() };
    (service as any).client = client;
    (service as any).available = true;

    const fn = jest.fn(async () => {});
    const ran = await service.runExclusive('cron-lock:job', 1000, fn);

    expect(ran).toBe(false);
    expect(fn).not.toHaveBeenCalled();
    expect(client.eval).not.toHaveBeenCalled();
  });

  it('skips rather than risking a duplicate run when acquire errors', async () => {
    const service = new RedisService(noRedisConfig);
    const client = { set: jest.fn(async () => { throw new Error('boom'); }), eval: jest.fn() };
    (service as any).client = client;
    (service as any).available = true;

    const fn = jest.fn(async () => {});
    const ran = await service.runExclusive('cron-lock:job', 1000, fn);

    expect(ran).toBe(false);
    expect(fn).not.toHaveBeenCalled();
  });

  it('releases the lock even if the work throws', async () => {
    const service = new RedisService(noRedisConfig);
    const client = { set: jest.fn(async () => 'OK'), eval: jest.fn(async () => 1) };
    (service as any).client = client;
    (service as any).available = true;

    const fn = jest.fn(async () => { throw new Error('work failed'); });
    await expect(service.runExclusive('cron-lock:job', 1000, fn)).rejects.toThrow('work failed');
    expect(client.eval).toHaveBeenCalledTimes(1);
  });
});

describe('RedisService.throttleIncrement', () => {
  it('returns null when Redis is unavailable', async () => {
    const service = new RedisService(noRedisConfig);
    expect(await service.throttleIncrement('key', 60000)).toBeNull();
  });

  it('returns hits and converts the pttl from ms to seconds', async () => {
    const service = new RedisService(noRedisConfig);
    const client = { eval: jest.fn(async () => [3, 45200]) };
    (service as any).client = client;
    (service as any).available = true;

    const result = await service.throttleIncrement('key', 60000);
    expect(result).toEqual({ totalHits: 3, timeToExpire: 46 });
    expect(client.eval).toHaveBeenCalledWith(expect.any(String), 1, 'key', '60000');
  });
});
