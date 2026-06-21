import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { EVENTS_CLIENT, Rpc, SettingsResolver, BotSettingsData, Asset } from '@gold-tracker/shared';

/**
 * RPC-backed settings for the bots: per-asset token/channel, chart toggle and
 * interactive-command toggle. Pulls the raw doc from core (cached ~15s) and
 * applies the same env fallback; the class name matches the original so
 * TelegramService is unchanged.
 */
@Injectable()
export class SettingsStoreService {
  private readonly resolver = new SettingsResolver(() => this.load());

  constructor(@Inject(EVENTS_CLIENT) private readonly client: ClientProxy) {}

  private async load(): Promise<BotSettingsData | null> {
    try {
      return await firstValueFrom(this.client.send<BotSettingsData>(Rpc.SettingsGet, {}).pipe(timeout(5000)));
    } catch {
      return null;
    }
  }

  invalidate(): void {
    this.resolver.invalidate();
  }

  telegram(asset: Asset): Promise<{ token: string; channelId: string }> {
    return this.resolver.telegram(asset);
  }

  commandsEnabled(): Promise<boolean> {
    return this.resolver.commandsEnabled();
  }

  sendCharts(): Promise<boolean> {
    return this.resolver.sendCharts();
  }
}
