import { Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import { AgentService } from '../../services/agent/agent.service';

@Controller('agent')
export class AgentController {
  constructor(private agentService: AgentService) {}

  @Post('chat')
  async createChat(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
    @Body() data: { query: string; id: string | undefined },
  ) {
    return await this.agentService.Chat(req, headers, data.query, data.id);
  }

  @Get('messages')
  async getMessages(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ) {
    return await this.agentService.getUserMessages(req, headers);
  }
}
