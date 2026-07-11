import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { USER } from 'generated/prisma/client';
import { AuthService } from 'src/services/auth/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get()
  async auth(@Req() req: Request): Promise<USER | undefined> {
    return this.authService.auth(req);
  }

  @Post('login')
  async login(
    @Req() req: Request,
    @Body()
    body: {
      email: string;
      name: string;
      photoUrl: string;
      oAuthProvider: string;
    },
  ): Promise<string | undefined> {
    return (this, this.authService.login(req, body));
  }
}
