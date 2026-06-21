import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout, catchError } from 'rxjs';
import { EVENTS_CLIENT, Rpc, ServiceStatus, BotSettingsData } from '@gold-tracker/shared';

/**
 * Thin typed wrapper over the RMQ request/response calls to core. Every read the
 * site serves goes through here, so the controllers stay declarative and the
 * 8s timeout / failure mapping lives in one place.
 */
@Injectable()
export class CoreClient {
  constructor(@Inject(EVENTS_CLIENT) private readonly client: ClientProxy) {}

  private send<T>(pattern: string, payload: unknown = {}): Promise<T> {
    return firstValueFrom(
      this.client.send<T>(pattern, payload).pipe(
        timeout(8000),
        catchError(() => {
          throw new ServiceUnavailableException('core service unavailable');
        }),
      ),
    );
  }

  latest(metal?: string) { return this.send(Rpc.PriceLatest, { metal }); }
  stats(metal?: string) { return this.send(Rpc.PriceStats, { metal }); }
  history(hours: number, limit: number, metal?: string) { return this.send(Rpc.PriceHistory, { hours, limit, metal }); }
  hourly(days: number, metal?: string) { return this.send(Rpc.PriceHourly, { days, metal }); }
  daily(months: number, metal?: string) { return this.send(Rpc.PriceDaily, { months, metal }); }
  candles(timeframe: string, metal?: string) { return this.send(Rpc.PriceCandles, { timeframe, metal }); }
  records(metal?: string) { return this.send(Rpc.PriceRecords, { metal }); }
  ratio() { return this.send(Rpc.PriceRatio, {}); }
  exportCsv(hours: number, metal?: string) { return this.send<string>(Rpc.PriceExportCsv, { hours, metal }); }

  analyticsSummary(metal?: string) { return this.send(Rpc.AnalyticsSummary, { metal }); }
  analyticsSeries(period: string, n: number, metal?: string) { return this.send(Rpc.AnalyticsSeries, { period, n, metal }); }

  settingsGet() { return this.send<BotSettingsData>(Rpc.SettingsGet, {}); }
  settingsUpdate(patch: Partial<BotSettingsData>) { return this.send<BotSettingsData>(Rpc.SettingsUpdate, patch); }

  servicesList() { return this.send<ServiceStatus[]>(Rpc.ServicesList, {}); }

  // ---- Telegram admin (answered by the telegram-bot service) ----------------
  telegramStatus() { return this.send(Rpc.TelegramStatus, {}); }
  telegramLogs(limit: number, metal?: string) { return this.send(Rpc.TelegramLogs, { limit, metal }); }
  telegramSend(metal?: string, channelId?: string) { return this.send(Rpc.TelegramSend, { metal, channelId }); }
  telegramSendSummary(metal?: string, channelId?: string) { return this.send(Rpc.TelegramSendSummary, { metal, channelId }); }
  telegramChannelsList(metal?: string) { return this.send(Rpc.TelegramChannelsList, { metal }); }
  telegramChannelUpsert(body: any) { return this.send(Rpc.TelegramChannelUpsert, body); }
  telegramChannelDelete(id: string) { return this.send(Rpc.TelegramChannelDelete, { id }); }
}
