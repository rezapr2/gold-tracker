import { ConfigService } from '@nestjs/config';
import { SchedulerService } from './scheduler.service';

describe('SchedulerService.checkPriceAlert', () => {
  let service: SchedulerService;
  let telegram: { isReady: jest.Mock; sendAlert: jest.Mock };

  const build = (threshold = 1.5) => {
    telegram = { isReady: jest.fn(() => true), sendAlert: jest.fn() };
    const config = { get: jest.fn(() => threshold) } as unknown as ConfigService;
    service = new SchedulerService(
      {} as any, // goldPriceService
      telegram as any,
      {} as any, // analyticsService
      {} as any, // websocketGateway
      config,
    );
  };

  // checkPriceAlert is private; exercise it directly (defaults to gold).
  const check = (price: number, metal = 'XAU') => (service as any).checkPriceAlert(metal, price);

  it('seeds the baseline on the first observation without alerting', async () => {
    build();
    await check(2400);
    expect(telegram.sendAlert).not.toHaveBeenCalled();
  });

  it('does not alert for sub-threshold moves', async () => {
    build(1.5);
    await check(2400); // seed
    await check(2410); // ~0.42%
    expect(telegram.sendAlert).not.toHaveBeenCalled();
  });

  it('alerts once a move crosses the threshold', async () => {
    build(1.5);
    await check(2400); // seed
    await check(2450); // ~2.08%
    expect(telegram.sendAlert).toHaveBeenCalledTimes(1);
    const [metal, price, pct] = telegram.sendAlert.mock.calls[0];
    expect(metal).toBe('XAU');
    expect(price).toBe(2450);
    expect(pct).toBeCloseTo((50 / 2400) * 100);
  });

  it('tracks gold and silver baselines independently', async () => {
    build(1.5);
    await check(2400, 'XAU'); // seed gold
    await check(30, 'XAG'); // seed silver
    await check(2405, 'XAU'); // gold ~0.2% -> no alert
    await check(31, 'XAG'); // silver ~3.3% -> alert
    expect(telegram.sendAlert).toHaveBeenCalledTimes(1);
    expect(telegram.sendAlert.mock.calls[0][0]).toBe('XAG');
  });

  it('does not alert when the bot is not ready', async () => {
    build();
    telegram.isReady.mockReturnValue(false);
    await check(2400);
    await check(2500);
    expect(telegram.sendAlert).not.toHaveBeenCalled();
  });
});
