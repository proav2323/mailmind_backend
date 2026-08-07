import {
  Controller,
  Headers,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { CronService } from '../../services/cron/cron.service';
import { EmailsService } from '../../services/emails/emails.service';

@Controller('crons')
export class CronController {
  constructor(
    private cronService: CronService,
    private emailsService: EmailsService,
  ) {}
  @Post('priorities')
  async syncPriorities(@Headers('authorization') authHeader: string) {
    await this.cronService.handleCron(authHeader);
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
