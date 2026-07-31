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
import { GoogleService } from './services/google/google.service';
import { SocketGateway } from './gateways/socket/socket.gateway';
import { PubSubService } from './services/pub-sub/pub-sub.service';
import { ScheduleModule } from '@nestjs/schedule';
import { CronService } from './services/cron/cron.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [RedisModule, ScheduleModule.forRoot(), HttpModule],
  controllers: [AppController, AuthController, EmailsController],
  providers: [
    AppService,
    AuthService,
    EmailsService,
    JwtService,
    PrismaService,
    RedisService,
    EcryptionService,
    GoogleService,
    SocketGateway,
    PubSubService,
    CronService,
  ],
})
export class AppModule {}
