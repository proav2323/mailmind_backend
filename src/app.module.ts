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
import { CronService } from './services/cron/cron.service';
import { HttpModule } from '@nestjs/axios';
import { CronController } from './controllers/cron/cron.controller';
import { CalenderService } from './services/calender/calender.service';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { NotificationsService } from './services/notifications/notifications.service';
import { NotificationsController } from './controllers/notifications/notifications.controller';
import { EmailPubSubService } from './services/email-pub-sub/email-pub-sub.service';
import { CategoriesService } from './services/categories/categories.service';
import { CategoriesController } from './controllers/categories/categories.controller';

@Module({
  imports: [
    RedisModule,
    HttpModule.register({
      timeout: 300000, // Increase timeout to 60 seconds for AI processing
      maxRedirects: 5,
    }),
    NotificationsModule,
  ],
  controllers: [
    AppController,
    AuthController,
    EmailsController,
    CronController,
    NotificationsController,
    CategoriesController,
  ],
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
    CronService,
    CalenderService,
    NotificationsService,
    EmailPubSubService,
    CategoriesService,
  ],
})
export class AppModule {}
