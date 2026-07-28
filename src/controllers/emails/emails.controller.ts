import { Controller, Get, Headers, Req } from '@nestjs/common';
import { EmailsService } from 'src/services/emails/emails.service';

@Controller('emails')
export class EmailsController {
  constructor(private emailService: EmailsService) {}
  @Get()
  async getAllEmails(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ): Promise<(undefined | boolean[])[]> {
    return await this.emailService.getUserEmailS(req, headers);
  }
}
