import { Injectable, UnauthorizedException } from '@nestjs/common';
import { EmailsService } from '../emails/emails.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateId } from 'src/utils/generateId';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class CronService {
  constructor(
    private emailsService: EmailsService,
    private prismaService: PrismaService,
    private httpService: HttpService,
  ) {}

  async handleCron(authHeader: string) {
    const cronSecret = process.env.CRON_SECRET;
    if (authHeader !== `Bearer ${cronSecret}`) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    console.log('running cron job to change email priorities...');
    this.httpService.get('https://mailmind-backend.onrender.com/cron/sync', {
      headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    });
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
  }
}
