import { Controller, Post, Body } from '@nestjs/common';
import { EmailsService } from 'src/services/emails/emails.service';

@Controller('workflows/emails')
export class EmailsWorkflowController {
  constructor(private emailsService: EmailsService) {}
  @Post('/processEmails')
  async processEmails(
    @Body()
    body: {
      accessToken: string;
      idToken: string;
      refreshToken: string;
      scope: string;
      year: string;
      historyId: string | null;
      email: string;
      categories: { name: string; id: string; userId: string }[];
      userId: string;
    },
  ) {
    'use workflow';

    // send socket to loading emails if there is no emails in our database

    const {
      accessToken,
      idToken,
      refreshToken,
      scope,
      year,
      historyId,
      email,
      categories,
      userId,
    } = body;
    console.log('workflow-running');

    await this.emailsService.getEmailsWorkflow(
      accessToken,
      idToken,
      refreshToken,
      year,
      historyId,
      email,
      scope,
      categories,
      userId,
    );

    // add ocketconfiguartion for realtime chnages an send laoding finishes

    return { success: true };
  }
}
