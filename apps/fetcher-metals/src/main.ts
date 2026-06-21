import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { rmqMicroserviceOptions, RMQ_URL_DEFAULT, Queue } from '@gold-tracker/shared';

/**
 * Hybrid app: an RMQ microservice (consumes settings.changed) plus a small HTTP
 * server for the Docker health probe. Prices are emitted via the EVENTS_CLIENT.
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  const config = app.get(ConfigService);
  const url = config.get<string>('rabbitmq.url') || RMQ_URL_DEFAULT;

  app.connectMicroservice(rmqMicroserviceOptions(url, Queue.FetcherMetals), { inheritAppConfig: true });
  await app.startAllMicroservices();
  const port = config.get<number>('port');
  await app.listen(port);
  logger.log(`fetcher-metals running (health on :${port})`);
}

bootstrap();
