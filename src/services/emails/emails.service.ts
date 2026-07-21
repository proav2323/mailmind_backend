/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { RedisService } from '../redis/redis.service';
import { gmail_v1, google } from 'googleapis';
import { EcryptionService } from '../ecryption/ecryption.service';

@Injectable()
export class EmailsService {
  constructor(
    private JWT: JwtService,
    private prisma: PrismaService,
    private authService: AuthService,
    private redisService: RedisService,
    private ecryption: EcryptionService,
  ) {}
  async getUserEmailS(
    req: Request,
    headers: Record<string, string>,
  ): Promise<gmail_v1.Schema$Message[]> {
    const token = (req as Request & { cookies?: Record<string, string> })
      .cookies?.token;
    let secondToken: string | undefined = undefined;
    if (headers.authorization !== null && headers.authorization !== undefined) {
      secondToken = headers.authorization.split(' ')[1];
    }

    if (!token && !secondToken) {
      console.log('no token');
      throw new BadRequestException('token not valid');
    }
    const decoded = this.JWT.verify<{
      email: string;
      scopes: string[];
      scope: string;
    }>(token !== undefined && token !== null ? token : secondToken!, {
      secret: process.env.JWT_SECRET,
    });

    const user = await this.prisma.uSER.findUnique({
      where: { email: decoded.email },
    });

    if (!user) {
      throw new BadRequestException('user not found');
    }

    const refreshToken = user.refreshToken;
    const check = await this.redisService.checkIfItemExpired(
      `${user.email}-accessToken`,
    );

    let accessToken: string;
    let idToken: string;

    if (
      check.expired === true ||
      (check.expired === false && check.secondsLeft <= 300)
    ) {
      const res = await this.authService.getNewAccessToken(
        refreshToken,
        false,
        '',
        false,
      );

      if (!res.ok || res.status === 500) {
        const error = await res.text();
        throw new BadRequestException(error);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data: any = await res.json();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      accessToken = data['access_token'] as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      idToken = data['id_token'] as string;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const expressIn: number = data['expires_in'] as number;
      await this.authService.updateToken(
        accessToken,
        undefined,
        idToken,
        expressIn,
        user.email,
      );
    } else {
      const accessTokenHash = (await this.redisService.get(
        `${user.email}-accessToken`,
      )) as string;
      const idTokenHash = (await this.redisService.get(
        `${user.email}-idToken`,
      )) as string;

      accessToken = this.ecryption.decrypt(accessTokenHash);
      idToken = this.ecryption.decrypt(idTokenHash);
    }

    if (!accessToken || !idToken) {
      throw new BadRequestException('no access token and id token found');
    }

    const googleClient = new google.auth.OAuth2({
      client_id: process.env.GOOGLE_CLIENT_ID,
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
    });
    googleClient.setCredentials({
      access_token: accessToken,
      id_token: idToken,
      refresh_token: user.refreshToken,
      scope: decoded.scope,
    });
    const gmail = google.gmail({
      version: 'v1',
      auth: googleClient,
      key: process.env.GMAIL_API_KEY,
    });
    const userEmails: any[] = [];

    try {
      let nextPageToken: string | undefined = undefined;

      do {
        const response = await gmail.users.messages.list({
          userId: 'me', // 'me' indicates the authenticated user
          maxResults: 10, // Maximum per page allowed by Google is 100 but taking to long time... so make it 10 for now and stop for next page token also,
          pageToken: nextPageToken,
        });

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (!response.ok || response.status === 500) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          const error = await response.text();
          throw new BadRequestException('something went wrong: ' + error);
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (response.data.messages) {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          userEmails.push(...(response.data.messages as any[]));
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        // nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);

      const emailDetail = await gmail.users.messages.get({
        userId: 'me',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        id: userEmails[0].id,
        access_token: accessToken,
        auth: googleClient,
        key: process.env.GMAIL_API_KEY,
      });

      return [emailDetail.data];
    } catch (err) {
      console.log(err);
      throw new BadRequestException(String(err));
    }
  }

  private formatEmailPayload(messageData: any) {}
}
