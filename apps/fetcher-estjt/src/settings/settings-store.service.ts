import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { EVENTS_CLIENT, Rpc, SettingsResolver, BotSettingsData } from '@gold-tracker/shared';

/** RPC-backed settings (interval only) — pulls the raw doc from core, cached ~15s. */
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

  priceFetchInterval(): Promise<string> {
    return this.resolver.priceFetchInterval();
  }
}
