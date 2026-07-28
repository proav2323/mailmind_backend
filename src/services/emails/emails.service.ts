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
    { name: 'office', desc: '' },
    { name: 'OTP', decs: '' },
    { name: 'event', desc: '' },
    { name: 'hackathons', desc: '' },
    { name: 'class', desc: '' },
    { name: 'annoucements', desc: '' },
    { name: 'finace', desc: '' },
    { name: 'billing', desc: '' },
  ];

  async getUserEmailS(
    req: Request,
    headers: Record<string, string>,
  ): Promise<(undefined | boolean[])[]> {
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
      include: { categories: {} },
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

    const newUserCategories = user.categories.map((value) => {
      return { name: value.name, desc: value.desc };
    });

    newUserCategories.forEach((value) => this.categroies.push(value));
    const response = res.map((value) => {
      const body = this.googleService.extractEmailBody(value.payload); // extract body text
      const attachments = this.googleService.extractAttachmentMetadata(
        value.payload,
      ); // extrach attachments
      const headersImpData =
        this.googleService.extractImporantDetailsFromEmailHeaders(value);

      return {
        body: body,
        attachments: attachments,
        headers: headersImpData,
        myGivenId: generateId(8),
        categories: this.categroies,
        ...value,
      };
    });

    const aiRes = await fetch(`${process.env.AI_BACKEND_URL}/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: JSON.stringify(response) }),
    });

    if (!aiRes.ok || aiRes.status === 500) {
      const error = await aiRes.text();
      console.log(error);
      throw new BadRequestException('error occured: ' + error);
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const aiData = await aiRes.json();
    // @typescript-eslint/no-unsafe-member-access
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const aiArrays = aiData.data as Record<string, string>[];

    const data = response.map(async (value) => {
      const email = await this.prisma.eMAILS.findUnique({
        where: { gmailId: value.id! },
      });
      if (email) {
        return;
      }

      const aiData = aiArrays.find((val) => val.id === value.myGivenId);
      if (!aiData) {
        return;
      }

      const data = await this.prisma.eMAILS.create({
        data: {
          userId: user.id,
          body: value.body,
          gmailId: value.id!,
          id: value.myGivenId,
          isRead: false,
          receivedAt: value.headers.recievedAt?.value
            ? new Date(value.headers.recievedAt.value)
            : new Date(Date.now()),
          sender: value.headers.from?.value ? value.headers.from?.value : '',
          subject: aiData.subject,
          category: aiData.category,
          priority: aiData.priority,
          GmailSubject: value.headers.subject?.value
            ? value.headers.subject.value
            : '',
          summary: aiData.summary,
          deadline:
            aiData.deadline === 'null' ? null : new Date(aiData.deadline),
        },
      });

      const attach = value.attachments.map(async (value) => {
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

    return Promise.all(data);
  }
}
