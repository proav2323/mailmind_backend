import { Controller, Get, Headers, Req } from '@nestjs/common';
import { gmail_v1 } from 'googleapis';
import { EmailsService } from 'src/services/emails/emails.service';

@Controller('emails')
export class EmailsController {
  constructor(private emailService: EmailsService) {}
  @Get()
  async getAllEmails(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ): Promise<gmail_v1.Schema$Message[]> {
    return await this.emailService.getUserEmailS(req, headers);
  }
}
