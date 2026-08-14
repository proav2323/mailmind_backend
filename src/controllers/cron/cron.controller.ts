import {
  Body,
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { CronService } from '../../services/cron/cron.service';
import { EmailsService } from '../../services/emails/emails.service';
import { NotificationsService } from '../../services/notifications/notifications.service';

@Controller('crons')
export class CronController {
  constructor(
    private cronService: CronService,
    private emailsService: EmailsService,
    private notifcationService: NotificationsService,
  ) {}
  @Post('priorities')
  async syncPriorities() {
    await this.cronService.handleCron();
    await this.notifcationService.deleteOldNotifications();
    return { message: 'Priorities synced successfully' };
  }

  @Post('sync')
  async syncPrioritiesRealtime(@Headers('authorization') authHeader: string) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('invalid cron secret');
      throw new UnauthorizedException('Invalid cron secret');
    }
    await this.emailsService.changePriorities();
    return { message: 'Priorities synced successfully' };
  }
}
