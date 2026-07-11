import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './controllers/auth/auth.controller';
import { EmailsController } from './controllers/emails/emails.controller';
import { AuthService } from './services/auth/auth.service';
import { EmailsService } from './services/emails/emails.service';

@Module({
  imports: [],
  controllers: [AppController, AuthController, EmailsController],
  providers: [AppService, AuthService, EmailsService],
})
export class AppModule {}
