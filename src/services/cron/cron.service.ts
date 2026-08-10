import { Injectable } from '@nestjs/common';
import { EmailsService } from '../emails/emails.service';

@Injectable()
export class CronService {
  constructor(private emailsService: EmailsService) {}

  async handleCron() {
    await this.emailsService.changePriorities();
    await this.emailsService.checkUserWatchExp();
    return { message: 'Priorities synced successfully' };
  }
}
