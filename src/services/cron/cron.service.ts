import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EmailsService } from '../emails/emails.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateId } from 'src/utils/generateId';

@Injectable()
export class CronService {
  constructor(
    private emailsService: EmailsService,
    private prismaService: PrismaService,
  ) {}

  async handleCron(authHeader: string) {
    const cronSecret = process.env.CRON_SECRET;
    if (authHeader !== `Bearer ${cronSecret}`) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    console.log('running cron job to change email priorities...');
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
  }
}
