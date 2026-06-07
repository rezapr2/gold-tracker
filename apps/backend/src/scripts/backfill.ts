import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { GoldPriceService } from '../modules/gold-price/gold-price.service';
import { METALS, toMetal } from '../modules/gold-price/metal.types';

/**
 * One-time historical price backfill.
 *
 *   npm run backfill --workspace=apps/backend                 # all metals, ~5000 days
 *   npm run backfill --workspace=apps/backend -- 1000         # all metals, last 1000 days
 *   npm run backfill --workspace=apps/backend -- 1000 XAG     # silver only
 *
 * Requires TWELVE_DATA_KEY. Idempotent — safe to run more than once.
 */
async function run() {
  const logger = new Logger('Backfill');
  const days = parseInt(process.argv[2], 10) || 5000;
  const metals = process.argv[3] ? [toMetal(process.argv[3])] : METALS;

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const service = app.get(GoldPriceService);
    let any = false;

    for (const metal of metals) {
      const result = await service.backfillDailyHistory(days, metal);
      if (result) {
        any = true;
        logger.log(
          `[${metal}] Backfilled ${result.fetched} days from ${result.provider} ` +
            `(${result.inserted} inserted, ${result.updated} updated).`,
        );
      } else {
        logger.warn(`[${metal}] No data backfilled. Is TWELVE_DATA_KEY set?`);
      }
    }

    if (!any) process.exitCode = 1;
  } catch (error) {
    logger.error(`Backfill failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

run();
