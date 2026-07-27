import { BadRequestException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { RedisService } from '../redis/redis.service';
import { EcryptionService } from '../ecryption/ecryption.service';
import { GoogleService } from '../google/google.service';
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

  categroies = [
    { name: 'assignment', desc: '' },
    { name: 'project', desc: '' },
    { name: 'deadline', desc: '' },
    { name: 'syllabus', desc: '' },
    { name: 'task', desc: '' },
    { name: 'meeting', desc: '' },
    { name: 'review', desc: '' },
    { name: 'interview', desc: '' },
    { name: 'course', desc: '' },
    { name: 'exam', desc: '' },
    { name: 'submission', desc: '' },
    { name: 'invoice', desc: '' },
    { name: 'report', desc: '' },
    { name: 'schedule', desc: '' },
    { name: 'urgent', desc: '' },
    { name: 'education', desc: '' },
    { name: 'work', desc: '' },
    { name: 'school', desc: '' },
  ];

  async getUserEmailS(
    req: Request,
    headers: Record<string, string>,
  ): Promise<(false | boolean[])[]> {
    const token = (req as Request & { cookies?: Record<string, string> })
      .cookies?.token;
    let secondToken: string | undefined = undefined;
    const year = headers.year;
    const isFirst = Boolean(headers.first);
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
      isFirst,
    ); // store hsitory id in user databse to get new emails when user opens up the app and when user login again after 1 day, loop throught emails to chnage thir priority for user's new day

    const response = res.map(async (value) => {
      const email = await this.prisma.eMAILS.findUnique({
        where: { id: value.id! },
      });

      if (email) {
        return false;
      }

      const body = this.googleService.extractEmailBody(value.payload); // extract body text
      const attachments = this.googleService.extractAttachmentMetadata(
        value.payload,
      ); // extrach attachments
      const headersImpData =
        this.googleService.extractImporantDetailsFromEmailHeaders(value);
      console.log(process.env.AI_BACKEND_URL);

      const aiRes = await fetch(`${process.env.AI_BACKEND_URL}/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: new URLSearchParams({
          categories: JSON.stringify(this.categroies),
          email: JSON.stringify(body),
        }),
      });

      if (!aiRes.ok || aiRes.status === 500) {
        const error = await aiRes.text();
        console.log(error);
        return false;
      }
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const aiData = await aiRes.json();

      const data = await this.prisma.eMAILS.create({
        data: {
          userId: user.id,
          body: body,
          gmailId: value.id!,
          id: generateId(8),
          isRead: false,
          receivedAt: new Date(
            headersImpData.recievedAt?.value
              ? headersImpData.recievedAt.value
              : Date.now(),
          ),
          sender: headersImpData.from?.value ? headersImpData.from?.value : '',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          subject: aiData.subject,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          category: aiData.category,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          priority: aiData.pr,
          GmailSubject: headersImpData.subject?.value
            ? headersImpData.subject.value
            : '',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          summary: aiData.summary,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          deadline: aiData.deadline,
        },
      });

      const attach = attachments.map(async (value) => {
        await this.prisma.eMAILS.update({
          where: { id: data.id },
          data: {
            attachments: {
              create: {
                attachmentId: value.attachmentId,
                file: value.filename,
                mimetype: value.mimeType,
                gmailId: data.gmailId,
              },
            },
          },
        });

        return true;
      });

      return Promise.all(attach);
    });

    return Promise.all(response);
  }
}
