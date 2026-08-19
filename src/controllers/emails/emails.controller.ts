import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
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
      not?: boolean;
    },
  ): Promise<any> {
    return await this.emailService.storeEmailDataToDatabase(
      body.data,
      body.emails,
      body.userId,
      body.not,
    );
  }

  @Get('user')
  async getUserEmails(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ) {
    return await this.emailService.getUserAllEmails(req, headers);
  }

  @Get('category/:category')
  async getCatgeoryEmails(@Param('category') category: string) {
    return await this.emailService.getCategoryEmails(category);
  }

  @Get('email/:id')
  async getEmail(@Param('id') id: string) {
    return await this.emailService.getSingleEmail(id);
  }

  @Get('filter')
  async getEmailsFilter(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
    @Query('category') category: string,
    @Query('priority') priority: string,
  ) {
    return await this.emailService.filter(priority, category, req, headers);
  }

  @Get('attachment/:messageId/:id')
  async getAttachment(
    @Param('messageId') messageId: string,
    @Param('id') id: string,
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ) {
    return await this.emailService.getAttachmentFromId(
      req,
      headers,
      id,
      messageId,
    );
  }
}
