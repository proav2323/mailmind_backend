import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { prisma } from './prisma';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(cookieParser());
  await prisma.$connect();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
