import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { rmqMicroserviceOptions, RMQ_URL_DEFAULT, Queue } from '@gold-tracker/shared';

/**
 * Core runs as a hybrid app: an RMQ microservice (consumes price.fetched +
 * heartbeats, answers prices./analytics./settings./services RPCs) plus a tiny
 * HTTP server purely for the Docker health probe.
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  const config = app.get(ConfigService);
  const url = config.get<string>('rabbitmq.url') || RMQ_URL_DEFAULT;

  app.connectMicroservice(rmqMicroserviceOptions(url, Queue.Core), { inheritAppConfig: true });

  await app.startAllMicroservices();
  const port = config.get<number>('port');
  await app.listen(port);
  logger.log(`Core service listening (RMQ queue=${Queue.Core}, health on :${port})`);
}

bootstrap();
