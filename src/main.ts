import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
import { Logger } from '@nestjs/common';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = process.env.PORT || 3000;
  app.use(cookieParser());
  app.enableCors({
    origin: ['https://black-inkk.vercel.app', 'http://localhost:3001'],
    credentials: true,
  });
  await app.listen(port);
  Logger.log(`Application is running on: Port ${port}`);
}
bootstrap();
