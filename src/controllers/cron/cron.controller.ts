import { Controller } from '@nestjs/common';
import { Post } from '@nestjs/common';
import { CronService } from '../../services/cron/cron.service';

@Controller('cron')
export class CronController {
  constructor(private cronService: CronService) {}
  @Post('priorities')
  async syncPriorities() {
    await this.cronService.handleCron();
    console.log(`done`);
    return { message: 'Priorities synced successfully' };
  }
}
