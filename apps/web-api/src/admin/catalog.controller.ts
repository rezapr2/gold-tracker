import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  ASSETS,
  ASSET_CODES,
  FETCHERS,
  assetsForFetcher,
  fetcherForAsset,
} from '@gold-tracker/shared';
import { CoreClient } from '../core/core.client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

/**
 * Admin catalog of every tracked asset and every fetcher, with live on/off
 * state, plus the toggles. Enable/disable is persisted on the `bot_settings`
 * doc (`disabledAssets` / `disabledFetchers`); core broadcasts `settings.changed`
 * so the fetchers re-read and stop/resume within ~15s — no restart.
 */
@ApiTags('admin')
@Controller('admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CatalogController {
  constructor(private readonly core: CoreClient) {}

  @Get('catalog')
  @ApiOperation({ summary: 'List every asset and fetcher with on/off state' })
  async catalog() {
    const settings = await this.core.settingsGet();
    const disabledAssets = new Set(settings.disabledAssets ?? []);
    const disabledFetchers = new Set(settings.disabledFetchers ?? []);

    const assets = ASSET_CODES.map((code) => {
      const def = ASSETS[code];
      const fetcher = fetcherForAsset(code);
      const fetcherOff = fetcher ? disabledFetchers.has(fetcher) : false;
      return {
        code,
        name: def.name,
        emoji: def.emoji,
        category: def.category,
        unit: def.unit,
        quoteCurrency: def.quoteCurrency,
        fetcher,
        enabled: !disabledAssets.has(code) && !fetcherOff,
        // off because its fetcher is paused, not toggled off individually
        disabledByFetcher: fetcherOff && !disabledAssets.has(code),
      };
    });

    const fetchers = FETCHERS.map((f) => ({
      service: f.service,
      label: f.label,
      assetCount: assetsForFetcher(f.service).length,
      enabled: !disabledFetchers.has(f.service),
    }));

    return { success: true, data: { assets, fetchers } };
  }

  @Patch('assets/:code')
  @ApiOperation({ summary: 'Enable or disable a single asset' })
  async setAsset(@Param('code') code: string, @Body('enabled') enabled: boolean) {
    const settings = await this.core.settingsGet();
    const disabled = new Set(settings.disabledAssets ?? []);
    if (enabled) disabled.delete(code);
    else disabled.add(code);
    const updated = await this.core.settingsUpdate({ disabledAssets: [...disabled] });
    return { success: true, data: updated };
  }

  @Patch('fetchers/:service')
  @ApiOperation({ summary: 'Enable or disable a whole fetcher' })
  async setFetcher(@Param('service') service: string, @Body('enabled') enabled: boolean) {
    const settings = await this.core.settingsGet();
    const disabled = new Set(settings.disabledFetchers ?? []);
    if (enabled) disabled.delete(service);
    else disabled.add(service);
    const updated = await this.core.settingsUpdate({ disabledFetchers: [...disabled] });
    return { success: true, data: updated };
  }
}
