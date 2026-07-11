import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { prisma } from './prisma';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.use(cookieParser());
  try {
    await prisma.$connect();
    console.log('connected');
  } catch (err) {
    console.log(err);
  }

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
