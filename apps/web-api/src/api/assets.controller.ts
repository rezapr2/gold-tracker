import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ASSETS, ASSET_CODES, fetcherForAsset } from '@gold-tracker/shared';
import { CoreClient } from '../core/core.client';

/**
 * Public list of currently-enabled assets. The site renders only these, so a
 * disabled asset (or one whose fetcher is paused) disappears from the UI.
 */
@ApiTags('assets')
@Controller('assets')
export class AssetsController {
  constructor(private readonly core: CoreClient) {}

  @Get()
  @ApiOperation({ summary: 'List enabled assets' })
  async list() {
    const settings = await this.core.settingsGet();
    const disabledAssets = new Set(settings.disabledAssets ?? []);
    const disabledFetchers = new Set(settings.disabledFetchers ?? []);

    const data = ASSET_CODES.filter(
      (c) => !disabledAssets.has(c) && !disabledFetchers.has(fetcherForAsset(c) ?? ''),
    ).map((code) => {
      const def = ASSETS[code];
      return {
        code,
        name: def.name,
        emoji: def.emoji,
        category: def.category,
        unit: def.unit,
        quoteCurrency: def.quoteCurrency,
      };
    });

    return { success: true, data };
  }
}
