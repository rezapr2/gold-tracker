import { RoutingKey, PriceFetchedEvent } from '@gold-tracker/shared';
import { IngestController } from './ingest.controller';

// Minimal RmqContext stand-in capturing ack/nack.
const makeCtx = () => {
  const channel = { ack: jest.fn(), nack: jest.fn() };
  const message = { content: Buffer.from('') };
  return { ctx: { getChannelRef: () => channel, getMessage: () => message } as any, channel };
};

describe('IngestController', () => {
  const fetched: PriceFetchedEvent = {
    asset: 'XAU',
    price: 2400,
    currency: 'USD',
    provider: 'gold-api.com',
    timestamp: new Date().toISOString(),
  };

  let price: { ingestPrice: jest.Mock };
  let settings: { alertThreshold: jest.Mock };
  let events: { emit: jest.Mock };
  let redis: { isAvailable: jest.Mock; get: jest.Mock; set: jest.Mock };
  let controller: IngestController;

  beforeEach(() => {
    price = { ingestPrice: jest.fn() };
    settings = { alertThreshold: jest.fn().mockResolvedValue(1.5) };
    events = { emit: jest.fn() };
    redis = { isAvailable: () => true, get: jest.fn(), set: jest.fn() } as any;
    controller = new IngestController(price as any, settings as any, events as any, redis as any);
  });

  it('persists the price and emits price.saved, then acks', async () => {
    price.ingestPrice.mockResolvedValue({
      price: 2400, currency: 'USD', metal: 'XAU', provider: 'gold-api.com', timestamp: new Date(),
    });
    redis.get.mockResolvedValue(null); // no baseline yet -> sets it, no alert
    const { ctx, channel } = makeCtx();

    await controller.onPriceFetched(fetched, ctx);

    expect(price.ingestPrice).toHaveBeenCalledWith(expect.objectContaining({ metal: 'XAU', price: 2400 }));
    const [routingKey, payload] = events.emit.mock.calls[0];
    expect(routingKey).toBe(RoutingKey.PriceSaved);
    expect(payload).toMatchObject({ metal: 'XAU', price: 2400 });
    expect(channel.ack).toHaveBeenCalled();
  });

  it('emits price.alert when the move exceeds the threshold', async () => {
    price.ingestPrice.mockResolvedValue({ price: 2500, metal: 'XAU', currency: 'USD', provider: 'p', timestamp: new Date() });
    redis.get.mockResolvedValue('2400'); // baseline -> +4.16% > 1.5%
    const { ctx } = makeCtx();

    await controller.onPriceFetched(fetched, ctx);

    const alertCall = events.emit.mock.calls.find((c) => c[0] === RoutingKey.PriceAlert);
    expect(alertCall).toBeTruthy();
    expect(alertCall[1]).toMatchObject({ asset: 'XAU', price: 2500 });
  });

  it('skips emit on a duplicate (ingest returns null) but still acks', async () => {
    price.ingestPrice.mockResolvedValue(null);
    const { ctx, channel } = makeCtx();

    await controller.onPriceFetched(fetched, ctx);

    expect(events.emit).not.toHaveBeenCalled();
    expect(channel.ack).toHaveBeenCalled();
  });

  it('nacks (dead-letters) when ingest throws', async () => {
    price.ingestPrice.mockRejectedValue(new Error('db down'));
    const { ctx, channel } = makeCtx();

    await controller.onPriceFetched(fetched, ctx);

    expect(channel.nack).toHaveBeenCalledWith(expect.anything(), false, false);
  });
});
