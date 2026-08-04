import { Controller, Post, Body, Req, Res, Next } from '@nestjs/common';
import { EmailsService } from 'src/services/emails/emails.service';
import * as exp from 'express';
import { serve } from '@upstash/workflow/express';
import { SocketGateway } from '../../gateways/socket/socket.gateway';

@Controller('workflow')
export class WorkflowController {
  constructor(
    private emailsService: EmailsService,
    private SOCKET: SocketGateway,
  ) {}
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
      await context.run('initial step', () => {
        this.SOCKET.sendUserEmailLoading(payload.email);
      });
      await context.run('llm call', async () => {
        await this.emailsService.emailWorkflow(payload);
      });
      await context.run('final step', () => {
        console.log('Final step executed');
        this.SOCKET.sendUserEmailMsg(payload.email);
      });
    });

    // 2. Dispatch NestJS's raw request and response object into the Upstash SDK handler
    await handler(req, res, next);
  }
}
