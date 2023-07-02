import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  const PORT = 2001;
  app.use(cookieParser());
  await app.listen(PORT);
}
bootstrap();
