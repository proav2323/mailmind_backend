import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmailsService } from '../emails/emails.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateId } from 'src/utils/generateId';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  constructor(
    private emailsService: EmailsService,
    private prismaService: PrismaService,
  ) {}

  @Cron('0 1 * * *', {
    timeZone: 'Asia/Kolkata',
  })
  async handleCron() {
    this.logger.log('Running task at 2:00 AM!');
    await this.prismaService.uSER.create({
      data: {
        email: 'testing@gmail.com',
        id: generateId(8),
        name: 'test smith',
        oAuthProvider: 'google',
        photoUrl: 'hdhd',
        refreshToken: '',
      },
    });
    await this.emailsService.changePriorities();
    this.logger.log('task completed at 2:00 AM!');
  }
}
