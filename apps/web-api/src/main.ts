import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './adapters/redis-io.adapter';
import { rmqMicroserviceOptions, RMQ_URL_DEFAULT, Queue } from '@gold-tracker/shared';

/**
 * The site backend / API gateway: HTTP + WebSocket for the frontend, plus an RMQ
 * microservice that consumes price.saved / price.alert and pushes them over the
 * socket. All data reads are RPCs to core (see CoreClient).
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] });
  const config = app.get(ConfigService);
  const port = config.get<number>('port');
  const frontendUrl = config.get<string>('frontendUrl');
  const url = config.get<string>('rabbitmq.url') || RMQ_URL_DEFAULT;

  app.enableCors({
    origin: [frontendUrl, 'http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connect();
  app.useWebSocketAdapter(redisIoAdapter);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Gold Tracker API')
    .setDescription('Real-time gold price tracking and analytics API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig), {
    swaggerOptions: { persistAuthorization: true },
  });

  // Consume price.saved / price.alert to drive WebSocket pushes.
  app.connectMicroservice(rmqMicroserviceOptions(url, Queue.WebApi), { inheritAppConfig: true });
  await app.startAllMicroservices();

  await app.listen(port);
  logger.log(`web-api running on :${port} (Swagger at /api/docs)`);
}

bootstrap();
