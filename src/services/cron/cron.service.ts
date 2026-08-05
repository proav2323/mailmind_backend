import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EmailsService } from '../emails/emails.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CronService {
  constructor(
    private emailsService: EmailsService,
    private prismaService: PrismaService,
  ) {}

  async handleCron(authHeader: string) {
    const cronSecret = process.env.CRON_SECRET;
    if (authHeader !== `Bearer ${cronSecret}`) {
      console.log('invalid cron secret');
      throw new UnauthorizedException('Invalid cron secret');
    }
    await this.emailsService.changePriorities();
    return { message: 'Priorities synced successfully' };
  }
}
