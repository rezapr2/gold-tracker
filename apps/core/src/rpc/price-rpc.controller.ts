import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Rpc, toAsset } from '@gold-tracker/shared';
import { GoldPriceService } from '../price/gold-price.service';

type MetalArg = { metal?: string };

/** Answers all `prices.*` read RPCs that web-api / telegram-bot send. */
@Controller()
export class PriceRpcController {
  constructor(private readonly price: GoldPriceService) {}

  @MessagePattern(Rpc.PriceLatest)
  latest(@Payload() p: MetalArg) {
    return this.price.getLatestPrice(toAsset(p?.metal));
  }

  @MessagePattern(Rpc.PriceStats)
  stats(@Payload() p: MetalArg) {
    return this.price.getPriceStats(toAsset(p?.metal));
  }

  @MessagePattern(Rpc.PriceHistory)
  history(@Payload() p: MetalArg & { hours?: number; limit?: number }) {
    return this.price.getPriceHistory(+(p?.hours ?? 24), +(p?.limit ?? 500), toAsset(p?.metal));
  }

  @MessagePattern(Rpc.PriceHourly)
  hourly(@Payload() p: MetalArg & { days?: number }) {
    return this.price.getHourlyHistory(+(p?.days ?? 7), toAsset(p?.metal));
  }

  @MessagePattern(Rpc.PriceDaily)
  daily(@Payload() p: MetalArg & { months?: number }) {
    return this.price.getDailyHistory(+(p?.months ?? 1), toAsset(p?.metal));
  }

  @MessagePattern(Rpc.PriceCandles)
  candles(@Payload() p: MetalArg & { timeframe?: '1h' | '4h' | '1d' | '7d' | '30d' }) {
    return this.price.getCandlestickData(p?.timeframe ?? '1d', toAsset(p?.metal));
  }

  @MessagePattern(Rpc.PriceRecords)
  records(@Payload() p: MetalArg) {
    return this.price.getRecords(toAsset(p?.metal));
  }

  @MessagePattern(Rpc.PriceRatio)
  ratio() {
    return this.price.getGoldSilverRatio();
  }

  @MessagePattern(Rpc.PriceExportCsv)
  exportCsv(@Payload() p: MetalArg & { hours?: number }) {
    return this.price.exportHistoryCsv(+(p?.hours ?? 720), toAsset(p?.metal));
  }
}
