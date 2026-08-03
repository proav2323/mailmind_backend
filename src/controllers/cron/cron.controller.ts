import { Controller } from '@nestjs/common';
import { Get } from '@nestjs/common';
import { CronService } from '../../services/cron/cron.service';

@Controller('cron')
export class CronController {
  constructor(private cronService: CronService) {}
  @Get('priorities')
  async syncPriorities() {
    await this.cronService.handleCron();
    console.log(`done`);
    return { message: 'Priorities synced successfully' };
  }
}
