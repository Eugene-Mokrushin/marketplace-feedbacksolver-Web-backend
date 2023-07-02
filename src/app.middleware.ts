import { Injectable, NestMiddleware, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';

const bootstrap = async (express: Express.Application) => {
  const app = await NestFactory.create(AppModule, new ExpressAdapter(express), {
    logger: ['error', 'warn'],
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  await app.init();
  return app;
};

@Injectable()
export class AppMiddleware implements NestMiddleware {
  constructor(private expressInstance: Express.Application) {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  use(_req: any, _res: any, _next: () => void) {
    return bootstrap(this.expressInstance);
  }
}
