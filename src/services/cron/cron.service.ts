import { Injectable } from '@nestjs/common';
import { EmailsService } from '../emails/emails.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateId } from 'src/utils/generateId';

@Injectable()
export class CronService {
  constructor(
    private emailsService: EmailsService,
    private prismaService: PrismaService,
  ) {}

  async handleCron() {
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
