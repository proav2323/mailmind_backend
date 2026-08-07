import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { EmailsService } from '../../services/emails/emails.service';

@Controller('emails')
export class EmailsController {
  constructor(private emailService: EmailsService) {}
  @Get()
  async getAllEmails(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ): Promise<{ status: string; id: string }> {
    return await this.emailService.getUserEmailS(req, headers);
  }

  @Post('store')
  async storeEmailData(
    @Body()
    body: {
      data: string;
      userId: string;
      emails: string;
    },
  ): Promise<any> {
    return await this.emailService.storeEmailDataToDatabase(
      body.data,
      body.emails,
      body.userId,
    );
  }
}
