import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './controllers/auth/auth.controller';
import { EmailsController } from './controllers/emails/emails.controller';
import { AuthService } from './services/auth/auth.service';
import { EmailsService } from './services/emails/emails.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './services/prisma/prisma.service';
import { RedisService } from './services/redis/redis.service';
import { RedisModule } from './redis/redis.module';
import { EcryptionService } from './services/ecryption/ecryption.service';

@Module({
  imports: [RedisModule],
  controllers: [AppController, AuthController, EmailsController],
  providers: [
    AppService,
    AuthService,
    EmailsService,
    JwtService,
    PrismaService,
    RedisService,
    EcryptionService,
  ],
})
export class AppModule {}
