import { ConfigService } from '@nestjs/config';
import { TelegramService } from './telegram.service';

const stats = {
  current: 2400,
  day: { changePercent: 1.2, changeAmount: 28, high: 2410, low: 2380, open: 2372 },
  week: { changePercent: -0.5 },
};

function build(channels: any[]) {
  const created: any[] = [];
  const publishLogModel: any = {
    create: jest.fn((doc) => {
      created.push(doc);
      return Promise.resolve({ _id: `id-${created.length}`, ...doc });
    }),
    findByIdAndUpdate: jest.fn().mockResolvedValue({}),
    find: jest.fn(),
    findOne: jest.fn(),
    countDocuments: jest.fn(),
  };
  const config = {
    get: (k: string) => ({ frontendUrl: 'https://app.test' } as Record<string, any>)[k],
  } as unknown as ConfigService;
  const goldPriceService: any = {
    getPriceStats: jest.fn().mockResolvedValue(stats),
    getGoldSilverRatio: jest.fn().mockResolvedValue({ ratio: 80, gold: 2400, silver: 30 }),
    getCandlestickData: jest.fn().mockResolvedValue([]),
  };
  const chartImageService: any = { generateGoldChart: jest.fn() };
  const channelService: any = { listEnabled: jest.fn().mockResolvedValue(channels) };
  // Telegram token/channel, chart and command toggles now resolve through the
  // settings store rather than ConfigService.
  const settings: any = {
    telegram: jest.fn(async () => ({ token: 'tok', channelId: '@env-gold' })),
    sendCharts: jest.fn(async () => false), // skip image rendering in this test
    commandsEnabled: jest.fn(async () => false),
  };

  const service = new TelegramService(
    publishLogModel,
    config,
    goldPriceService,
    chartImageService,
    channelService,
    settings,
  );
  return { service, publishLogModel, created };
}

describe('TelegramService broadcasting', () => {
  it('broadcasts to the env channel plus enabled DB channels', async () => {
    const { service, created } = build([
      { channelId: '@a', template: '{metalName} ${price}' },
      { channelId: '@b' },
    ]);

    const logs = await service.sendPriceUpdate('XAU');

    expect(logs).toHaveLength(3); // @env-gold, @a, @b
    const channelIds = created.map((c) => c.channelId).sort();
    expect(channelIds).toEqual(['@a', '@b', '@env-gold']);
  });

  it('applies a per-channel template, default text elsewhere', async () => {
    const { service, created } = build([{ channelId: '@fa', template: '{emoji} {metalName}: ${price}' }]);

    await service.sendPriceUpdate('XAU');

    const templated = created.find((c) => c.channelId === '@fa');
    expect(templated.messageText).toBe('🥇 Gold: $2,400.00');

    const envDefault = created.find((c) => c.channelId === '@env-gold');
    expect(envDefault.messageText).toContain('Gold Market Update'); // built-in format
  });

  it('answers /ratio with the current ratio', async () => {
    const { service } = build([]);
    const bot: any = { sendMessage: jest.fn().mockResolvedValue({}) };

    await (service as any).replyWithRatio(bot, 123);

    expect(bot.sendMessage).toHaveBeenCalledTimes(1);
    expect(bot.sendMessage.mock.calls[0][1]).toContain('80.0');
  });
});
