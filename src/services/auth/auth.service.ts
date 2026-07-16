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
    const serverAuthCode: string = body['serverAuthCode'] as string;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const scopes: string[] = body['scopes'] as string[];
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const accessTokenMobile: string = body['accessToken'] as string;

    try {
      const googleRes = await this.getNewAccessToken(serverAuthCode, true);
      const data = googleRes.json();

      const refreshToken: string = data['refresh_token'] as string;
      const accessToken: string = data['access_token'] as string;
      const idToken: string = data['id_token'] as string;
      const scope: string = data['scope'] as string;
      const expressIn: number = data['expires_in'] as number;

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
            expiresIn: expressIn,
            accessToken: accessToken,
            accessTokenMobile: accessTokenMobile,
            idToken: idToken,
            id: generateId(8),
          },
        });
      } else {
        await this.prisma.uSER.update({
          where: { email: email },
          data: {
            expiresIn: expressIn,
            accessToken: accessToken,
            accessTokenMobile: accessTokenMobile,
            idToken: idToken,
          },
        });
      }

      const token = this.JWT.sign(
        {
          email: email,
          refreshToken: refreshToken,
          scopes: scopes,
          scope: scope,
        },
        { expiresIn: '1d', secret: process.env.JWT_SECRET },
      );

      res.cookie('token', token);

      return token;
    } catch (err: any) {
      console.log(err);
      throw new BadRequestException('something went wrong');
    }
  }

  async checkIfNeedRefresh(email: string): Promise<boolean> {
    const user = await this.prisma.uSER.findUnique({ where: { email: email } });
    if (!user) {
      throw new BadRequestException('user not found');
    }

    const currentTime = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
    const bufferTime = 420; // 7-minute safety window to prevent late failures
    let needRefresh = false;

    if (currentTime >= user.expiresIn - bufferTime) {
      needRefresh = true;
    }

    return needRefresh;
  }

  async getNewAccessToken(
    refreshToken: string,
    isServerCode: boolean,
  ): Promise<globalThis.Response> {
    if (isServerCode) {
      const googleRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: refreshToken,
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

      if (googleRes.ok === false || googleRes.status === 500) {
        throw new BadRequestException(
          `somehting went wrong with google api to get anew token`,
        );
      }

      return googleRes;
    } else {
      const googleRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: process.env.GOOGLE_CLIENT_ID
            ? process.env.GOOGLE_CLIENT_ID
            : '',
          client_secret: process.env.GOOGLE_CLIENT_SECRET
            ? process.env.GOOGLE_CLIENT_SECRET
            : '',
          grant_type: 'refresh_token',
        }).toString(),
      });

      if (googleRes.ok === false || googleRes.status === 500) {
        throw new BadRequestException(
          `somehting went wrong with google api to refresh token`,
        );
      }

      return googleRes;
    }
  }

  async updateToken() {}

  async getToken() {}
}
