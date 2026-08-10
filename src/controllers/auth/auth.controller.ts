import { Body, Controller, Get, Headers, Post, Req, Res } from '@nestjs/common';
import * as res from 'express';
import { AuthService } from '../../services/auth/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  async auth(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ): Promise<
    | {
        id: string;
        email: string;
        branch: string | null;
        college: string | null;
        year: number | null;
        oAuthProvider: string;
        created_at: Date;
        updated_at: Date;
        name: string;
        photoUrl: string;
      }
    | undefined
  > {
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

  @Get('save')
  async saveFids(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ) {
    return await this.authService.saveFids(req, headers);
  }

  @Get('remove')
  async removeFids(
    @Req() req: Request,
    @Headers() headers: Record<string, string>,
  ) {
    return await this.authService.removeFids(req, headers);
  }
}
