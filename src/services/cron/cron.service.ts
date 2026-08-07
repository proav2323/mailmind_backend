import { Injectable } from '@nestjs/common';
import { EmailsService } from '../emails/emails.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CronService {
  constructor(
    private emailsService: EmailsService,
    private prismaService: PrismaService,
  ) {}

  async handleCron() {
    await this.emailsService.changePriorities();
    return { message: 'Priorities synced successfully' };
  }
}
