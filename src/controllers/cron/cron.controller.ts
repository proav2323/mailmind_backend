import { Controller, Headers, UnauthorizedException } from '@nestjs/common';
import { Get } from '@nestjs/common';
import { CronService } from '../../services/cron/cron.service';
import { EmailsService } from 'src/services/emails/emails.service';

@Controller('cron')
export class CronController {
  constructor(
    private cronService: CronService,
    private emailsService: EmailsService,
  ) {}
  @Get('priorities')
  async syncPriorities(@Headers('authorization') authHeader: string) {
    await this.cronService.handleCron(authHeader);
    return { message: 'Priorities synced successfully' };
  }

  @Get('sync')
  async syncPrioritiesRealtime(@Headers('authorization') authHeader: string) {
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    await this.emailsService.changePriorities();
    return { message: 'Priorities synced successfully' };
  }
}
