import { Controller, Headers } from '@nestjs/common';
import { Get } from '@nestjs/common';
import { CronService } from '../../services/cron/cron.service';

@Controller('cron')
export class CronController {
  constructor(private cronService: CronService) {}
  @Get('priorities')
  async syncPriorities(@Headers('authorization') authHeader: string) {
    await this.cronService.handleCron(authHeader);
    return { message: 'Priorities synced successfully' };
  }
}
