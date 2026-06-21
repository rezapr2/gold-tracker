import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { EVENTS_CLIENT, Rpc } from '@gold-tracker/shared';

/**
 * Price data the bots need, fetched from core over RPC. Method names mirror the
 * old in-process GoldPriceService so TelegramService is unchanged.
 */
@Injectable()
export class CoreClient {
  constructor(@Inject(EVENTS_CLIENT) private readonly client: ClientProxy) {}

  private send<T>(pattern: string, payload: unknown = {}): Promise<T> {
    return firstValueFrom(this.client.send<T>(pattern, payload).pipe(timeout(8000)));
  }

  getPriceStats(metal?: string) {
    return this.send<any>(Rpc.PriceStats, { metal });
  }

  getGoldSilverRatio() {
    return this.send<any>(Rpc.PriceRatio, {});
  }

  getCandlestickData(timeframe: string, metal?: string) {
    return this.send<any[]>(Rpc.PriceCandles, { timeframe, metal });
  }
}
