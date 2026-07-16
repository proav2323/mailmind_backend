import 'dotenv/config';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';
import { generateId } from '../../utils/generateId';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private JWT: JwtService,
    private prisma: PrismaService,
  ) {}
  async auth(req: Request) {
    const token = (req as Request & { cookies?: Record<string, string> })
      .cookies?.token;
    if (!token) {
      console.log('no token');
      throw new BadRequestException('token not valid');
    }

    const decoded = this.JWT.verify<{ email: string; accessToken: string }>(
      token,
      { secret: process.env.JWT_SECRET },
    );

    const user = await this.prisma.uSER.findUnique({
      where: { email: decoded.email },
      include: {
        emails: {
          include: { User: {} },
        },
        notifications: {
          include: { User: {} },
        },
      },
    });

    if (!user) {
      throw new BadRequestException('user not found');
    }

    return user;
  }

  async login(req: Request, body: any, res: Response) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const email: string = body['email'] as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const name: string = body['name'] as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const photoUrl: string = body['photoUrl'] as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const oAuthProvider: string = body['oAuthProvider'] as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const accessToken: string = body['accessToken'] as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const serverAuthCode: string = body['serverAuthCode'] as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const scopes: string[] = body['scopes'] as string[];

    try {
      const googleRes = await fetch('https://googleapis.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: serverAuthCode,
          client_id: process.env.GOOGLE_CLIENT_ID
            ? process.env.GOOGLE_CLIENT_ID
            : '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET
            ? process.env.GOOGLE_CLIENT_SECRET
            : '',
          grant_type: 'authorization_code',
          redirect_uri: '',
        }).toString(),
      });

      console.log(googleRes);

      if (googleRes.ok === false || googleRes.status === 500) {
        throw new BadRequestException(`somehting went wrong with google api`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data: any = await googleRes.json();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const refreshToken: string = data['refreshToken'] as string;

      console.log(refreshToken, scopes, accessToken, data);

      const user = await this.prisma.uSER.findUnique({
        where: { email: email },
      });
      if (!user) {
        await this.prisma.uSER.create({
          data: {
            email: email,
            name: name,
            photoUrl: photoUrl,
            oAuthProvider: oAuthProvider,
            id: generateId(8),
          },
        });
      }

      const token = this.JWT.sign(
        {
          email: email,
          accessToken: accessToken,
          refreshToken: refreshToken,
          scopes: scopes,
        },
        { expiresIn: '30m', secret: process.env.JWT_SECRET },
      );

      res.cookie('token', token);

      return token;
    } catch (err: any) {
      console.log(err);
      throw new BadRequestException('something went wrong');
    }
  }
}
