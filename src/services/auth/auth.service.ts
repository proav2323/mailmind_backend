import 'dotenv/config';
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';
import { generateId } from '../../utils/generateId';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EcryptionService } from '../ecryption/ecryption.service';

@Injectable()
export class AuthService {
  constructor(
    private JWT: JwtService,
    private prisma: PrismaService,
    private redis: RedisService,
    private encrpyt: EcryptionService,
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

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data: any = await googleRes.json();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const refreshToken: string = data['refresh_token'] as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const accessToken: string = data['access_token'] as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const idToken: string = data['id_token'] as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const scope: string = data['scope'] as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const expressIn: number = data['expires_in'] as number;

      let newEmail = '';
      let newName = '';
      let newPhotoUrl = '';

      if (name === 'web' && email === 'web' && photoUrl === 'web') {
        // 2. Fetch user profile information using the access token
        const userResponse = await fetch(
          'https://www.googleapis.com/oauth2/v3/userinfo',
          {
            headers: { Authorization: `Bearer ${accessToken}` },
          },
        );

        if (!userResponse.ok || userResponse.status === 500) {
          const error = await userResponse.text();
          throw new BadRequestException('somethin went wrong' + error);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const userData = await userResponse.json();

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        newEmail = userData.email;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        newName = userData.name;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        newPhotoUrl = userData.picture;
      }

      await this.updateToken(
        accessToken,
        accessTokenMobile,
        idToken,
        expressIn,
        email === 'web' ? newEmail : email,
      );

      const user = await this.prisma.uSER.findUnique({
        where: { email: email === 'web' ? newEmail : email },
      });

      if (!user) {
        await this.prisma.uSER.create({
          data: {
            email: email === 'web' ? newEmail : email,
            name: name === 'web' ? newName : name,
            photoUrl: photoUrl === 'web' ? newPhotoUrl : photoUrl,
            oAuthProvider: oAuthProvider,
            refreshToken: refreshToken,
            id: generateId(8),
          },
        });
      } else {
        await this.prisma.uSER.update({
          where: { email: email },
          data: {
            email: email === 'web' ? newEmail : email,
            name: name === 'web' ? newName : name,
            photoUrl: photoUrl === 'web' ? newPhotoUrl : photoUrl,
            oAuthProvider: oAuthProvider,
            refreshToken: refreshToken,
          },
        });
      }

      const token = this.JWT.sign(
        {
          email: email,
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

  async updateToken(
    accessToken: string,
    accessTokenMobile: string,
    idToken: string,
    expressIn: number,
    email: string,
  ) {
    const accessTokenHash = this.encrpyt.encrypt(accessToken);
    const accessTokenMobileHash = this.encrpyt.encrypt(accessTokenMobile);
    const idTokenHash = this.encrpyt.encrypt(idToken);

    await this.redis.save(accessTokenHash, `${email}-accessToken`, expressIn);
    await this.redis.save(
      accessTokenMobileHash,
      `${email}-accessTokenMobile`,
      expressIn,
    );
    await this.redis.save(idTokenHash, `${email}-idToken`, expressIn);
  } // update token on redis
}
