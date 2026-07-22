import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { RedisService } from '../redis/redis.service';
import { EcryptionService } from '../ecryption/ecryption.service';
import { GoogleService } from '../google/google.service';
import { gmail_v1 } from 'googleapis';
import { generateId } from 'src/utils/generateId';

@Injectable()
export class EmailsService {
  constructor(
    private JWT: JwtService,
    private prisma: PrismaService,
    private authService: AuthService,
    private redisService: RedisService,
    private ecryption: EcryptionService,
    private googleService: GoogleService,
  ) {}
  async getUserEmailS(
    req: Request,
    headers: Record<string, string>,
  ): Promise<gmail_v1.Schema$Message[]> {
    const token = (req as Request & { cookies?: Record<string, string> })
      .cookies?.token;
    let secondToken: string | undefined = undefined;
    const year = headers.year;
    if (headers.authorization !== null && headers.authorization !== undefined) {
      secondToken = headers.authorization.split(' ')[1];
    }

    if (!token && !secondToken) {
      console.log('no token');
      throw new BadRequestException('token not valid');
    }

    if (!year) {
      throw new BadRequestException('provide year for filter');
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
        'no access mbile -toke and no need',
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

    const res = await this.googleService.getEmails(
      accessToken,
      idToken,
      user.refreshToken,
      decoded.scope,
      year,
    );

    res.map((value) => {
      const body = this.googleService.extractEmailBody(value.payload); // extract body text
      const attachments = this.googleService.extractAttachmentMetadata(
        value.payload,
      ); // extrach attachments
      const headersImpData =
        this.googleService.extractImporantDetailsFromEmailHeaders(value);

      // extrach category, prioti, summary from ai service
      // const data = await this.prisma.eMAILS.create({
      //   data: {
      //     userId: user.id,
      //     body: body,
      //     gmailId: value.id!,
      //     id: generateId(8),
      //     isRead: false,
      //     receivedAt: Date(headersImpData.recievedAt),
      //     sender: headersImpData.from?.value!,
      //     subject: headersImpData.subject?.value!,
      //   },
      // });

      // return data;
    });

    // return Promise.all(res);
    return res;
  }
}
