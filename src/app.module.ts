import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './controllers/auth/auth.controller';
import { EmailsController } from './controllers/emails/emails.controller';
import { AuthService } from './services/auth/auth.service';
import { EmailsService } from './services/emails/emails.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  imports: [],
  controllers: [AppController, AuthController, EmailsController],
  providers: [AppService, AuthService, EmailsService, JwtService],
})
export class AppModule {}
