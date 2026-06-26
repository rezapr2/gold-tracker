import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';
import { EVENTS_CLIENT, Rpc, SettingsResolver, BotSettingsData, ApiProvider, Asset } from '@gold-tracker/shared';

/**
 * RPC-backed settings, used by the providers in place of the monolith's
 * Mongo-backed store. It pulls the raw `bot_settings` doc from core over
 * RabbitMQ (cached ~15s) and applies the same DB⊕env precedence as everywhere
 * else; {@link invalidate} is called on a `settings.changed` event for instant
 * refresh. The class name matches the original so the providers are unchanged.
 */
@Injectable()
export class SettingsStoreService {
  private readonly resolver = new SettingsResolver(() => this.load());

  constructor(@Inject(EVENTS_CLIENT) private readonly client: ClientProxy) {}

  private async load(): Promise<BotSettingsData | null> {
    try {
      return await firstValueFrom(this.client.send<BotSettingsData>(Rpc.SettingsGet, {}).pipe(timeout(5000)));
    } catch {
      return null; // fall back to env-only resolution
    }
  }

  invalidate(): void {
    this.resolver.invalidate();
  }

  apiKey(provider: ApiProvider): Promise<string> {
    return this.resolver.apiKey(provider);
  }

  priceFetchInterval(): Promise<string> {
    return this.resolver.priceFetchInterval();
  }

  isFetcherEnabled(service: string): Promise<boolean> {
    return this.resolver.isFetcherEnabled(service);
  }

  enabledAssets(codes: Asset[]): Promise<Asset[]> {
    return this.resolver.enabledAssets(codes);
  }
}
