import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EmailsService } from '../emails/emails.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  constructor(private emailsService: EmailsService) {}

  @Cron('0 2 * * *', {
    timeZone: 'Asia/Kolkata',
  })
  async handleCron() {
    this.logger.log('Running task at 2:00 AM!');
    await this.emailsService.changePriorities();
    this.logger.log('task completed at 2:00 AM!');
  }
}
