import { Controller, Post, Body, Req, Res, Next } from '@nestjs/common';
import { EmailsService } from 'src/services/emails/emails.service';
import * as exp from 'express';
import { serve } from '@upstash/workflow/express';

@Controller('workflow')
export class WorkflowController {
  constructor(private emailsService: EmailsService) {}
  @Post('emails')
  async createEmailWorkflow(
    @Req() req: exp.Request,
    @Res() res: exp.Response,
    @Next() next: exp.NextFunction,
  ) {
    const handler = serve<{
      accessToken: string;
      idToken: string;
      refreshToken: string;
      year: string;
      historyId: string | null;
      email: string;
      scope: string;
      categories: { name: string; id: string; userId: string }[];
      userId: string;
    }>(async (context) => {
      const payload = context.requestPayload;
      await context.run('intial step', async () => {
        await this.emailsService.emailWorkflow(payload);
      });
      return { message: 'Email workflow created successfully' };
    });

    // 2. Dispatch NestJS's raw request and response object into the Upstash SDK handler
    await handler(req, res, next);
  }
}
