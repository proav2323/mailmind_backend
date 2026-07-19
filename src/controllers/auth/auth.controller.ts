import { Body, Controller, Get, Headers, Post, Req, Res } from '@nestjs/common';
import * as res from 'express';
import { USER } from '../../generated/prisma/client';
import { AuthService } from 'src/services/auth/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  async auth(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ): Promise<USER | undefined> {
    return await this.authService.auth(req, headers);
  }

  @Post('login')
  async login(
    @Req() req: Request,
    @Body()
    body: any,
    @Res({ passthrough: true }) response: res.Response,
  ): Promise<string | undefined> {
    return await this.authService.login(req, body, response);
  }
}
