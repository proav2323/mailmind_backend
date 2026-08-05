import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EmailsService } from '../emails/emails.service';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class CronService {
  constructor(
    private emailsService: EmailsService,
    private prismaService: PrismaService,
    private httpService: HttpService,
  ) {}

  handleCron(authHeader: string) {
    const cronSecret = process.env.CRON_SECRET;
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('invalid cron secret');
      throw new UnauthorizedException('Invalid cron secret');
    }
    this.httpService.get('https://mailmind-backend.vercel.app/crons/sync', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
  }
}
