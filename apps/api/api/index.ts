import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../dist/app.module.js';
import { getCorsOptions } from '../dist/common/config/cors.config.js';

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => unknown;

let cachedHandlerPromise: Promise<RequestHandler> | null = null;

async function getHandler(): Promise<RequestHandler> {
  if (!cachedHandlerPromise) {
    cachedHandlerPromise = (async () => {
      const app = await NestFactory.create(AppModule);
      app.enableCors(getCorsOptions());
      app.useGlobalPipes(
        new ValidationPipe({
          whitelist: true,
          transform: true,
        }),
      );
      await app.init();
      return app.getHttpAdapter().getInstance() as RequestHandler;
    })().catch((error: unknown) => {
      cachedHandlerPromise = null;
      throw error;
    });
  }

  return cachedHandlerPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<unknown> {
  const requestHandler = await getHandler();
  return requestHandler(req, res);
}
