import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { RedisService } from '../redis/redis.service';
import { EcryptionService } from '../ecryption/ecryption.service';
import { GoogleService } from '../google/google.service';
import { generateId } from '../../utils/generateId';
import { Client } from '@upstash/workflow';
import { gmail_v1 } from 'googleapis';
import { SocketGateway } from '../../gateways/socket/socket.gateway';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EmailsService {
  constructor(
    private JWT: JwtService,
    private prisma: PrismaService,
    private authService: AuthService,
    private redisService: RedisService,
    private ecryption: EcryptionService,
    private googleService: GoogleService,
    private SOCKET: SocketGateway,
    private http: HttpService,
    private notidicationService: NotificationsService,
  ) {}

  private workflowClinet = new Client({
    token: process.env.QSTASH_TOKEN,
    baseUrl: process.env.QSTASH_URL ?? 'https://qstash-eu-central-1.upstash.io',
  });

  categroies = [
    { name: 'assignment' },
    { name: 'project' },
    { name: 'syllabus' },
    { name: 'task' },
    { name: 'meeting' },
    { name: 'review' },
    { name: 'interview' },
    { name: 'course' },
    { name: 'exam' },
    { name: 'submission' },
    { name: 'invoice' },
    { name: 'report' },
    { name: 'schedule' },
    { name: 'urgent' },
    { name: 'education' },
    { name: 'work' },
    { name: 'school' },
    { name: 'office' },
    { name: 'OTP' },
    { name: 'event' },
    { name: 'hackathons' },
    { name: 'class', desc: '' },
    { name: 'annoucements' },
    { name: 'finace' },
    { name: 'billing' },
    { name: 'placement' },
    { name: 'reminder' },
    { name: 'fees' },
    { name: 'scholarship' },
    { name: 'timetable' },
    { name: 'academic' },
    { name: 'holiday' },
    { name: 'club' },
    { name: 'intership' },
    { name: 'research' },
    { name: 'Finace' },
    { name: 'personal' },
    { name: 'spam' },
    { name: 'social' },
  ];

  async getUserEmailS(
    req: Request,
    headers: Record<string, string>,
  ): Promise<{ status: string; id: string }> {
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

    return await this.get_user_emails(decoded.email, decoded.scope, year);
  }

  async get_user_emails(
    email: string,
    scope: string,
    year: string,
    not?: boolean,
  ) {
    const user = await this.prisma.uSER.findUnique({
      where: { email: email },
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

    if (!user.isWatching) {
      const data = await this.googleService.watch(
        accessToken,
        user.refreshToken,
        idToken,
      );

      await this.prisma.uSER.update({
        where: { email: email },
        data: {
          isWatching: true,
          exp: data.data.expiration
            ? new Date(Number(data.data.expiration))
            : null,
        },
      });
    }

    const body = {
      accessToken,
      idToken,
      refreshToken: user.refreshToken,
      scope: scope,
      year,
      historyId: user.historyId,
      email: user.email,
      categories: user.categories,
      userId: user.id,
      not: not,
    };

    await this.emailWorkflow(body);

    return { status: 'success', id: '' };
  }

  private async getEmailsWorkflow(
    accessToken: string,
    idToken: string,
    refreshToken: string,
    year: string,
    historyId: string | null,
    email: string,
    scope: string,
    categories: { name: string; id: string; userId: string }[],
    userId: string,
    not?: boolean,
  ) {
    const res = await this.googleService.getEmails(
      accessToken,
      idToken,
      refreshToken,
      scope,
      year,
      historyId === undefined || historyId === null ? true : false,
      email,
      historyId,
    );

    const newUserCategories = categories.map((value) => {
      return { name: value.name };
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
        id: value.id,
      };
    });
    await this.redisService.save(
      JSON.stringify(response),
      `${userId}-emails`,
      3600,
    );
    try {
      await firstValueFrom(
        this.http.get(`https://mailmingaiwakingfix.vercel.app/wake`, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 300000,
        }),
      );
      await firstValueFrom(
        this.http.post(
          `${process.env.AI_BACKEND_URL}/email`,
          {
            data: `${userId}-emails`,
            userId: userId,
          },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout: 300000,
          },
        ),
      );
    } catch (err) {
      console.log(err);
      throw new BadRequestException('something went wrong');
    }

    this.SOCKET.sendUserEmailLoading(email);
    if (not) {
      await this.notidicationService.sendPushNotifications(
        'recieved a new email from processing',
        'your new email will ready by ai agents in 1 minute',
        email,
      );
    }
    return 'done';
  }

  async storeEmailDataToDatabase(data: string, emails: string, userId: string) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion
    const responseStr = (await this.redisService.get(emails)) as any;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unnecessary-type-assertion
    const aiArraysStr = (await this.redisService.get(data)) as any;
    let response: {
      body: {
        text: string;
        html: string;
      };
      attachments: {
        filename: string;
        mimeType: string;
        attachmentId: string;
      }[];
      headers: {
        subject: gmail_v1.Schema$MessagePartHeader | undefined;
        deliveredTo: gmail_v1.Schema$MessagePartHeader | undefined;
        from: gmail_v1.Schema$MessagePartHeader | undefined;
        recievedAt: gmail_v1.Schema$MessagePartHeader | undefined;
      };
      myGivenId: string;
      categories: (
        | {
            name: string;
            desc?: undefined;
          }
        | {
            name: string;
            desc: string;
          }
      )[];
      id: string | null | undefined;
    }[] = [];
    let aiArrays: Record<string, unknown>[] = [];
    if (typeof responseStr === 'object') {
      response = responseStr as {
        body: {
          text: string;
          html: string;
        };
        attachments: {
          filename: string;
          mimeType: string;
          attachmentId: string;
        }[];
        headers: {
          subject: gmail_v1.Schema$MessagePartHeader | undefined;
          deliveredTo: gmail_v1.Schema$MessagePartHeader | undefined;
          from: gmail_v1.Schema$MessagePartHeader | undefined;
          recievedAt: gmail_v1.Schema$MessagePartHeader | undefined;
        };
        myGivenId: string;
        categories: (
          | {
              name: string;
              desc?: undefined;
            }
          | {
              name: string;
              desc: string;
            }
        )[];
        id: string | null | undefined;
      }[];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      response = JSON.parse(responseStr) as {
        body: {
          text: string;
          html: string;
        };
        attachments: {
          filename: string;
          mimeType: string;
          attachmentId: string;
        }[];
        headers: {
          subject: gmail_v1.Schema$MessagePartHeader | undefined;
          deliveredTo: gmail_v1.Schema$MessagePartHeader | undefined;
          from: gmail_v1.Schema$MessagePartHeader | undefined;
          recievedAt: gmail_v1.Schema$MessagePartHeader | undefined;
        };
        myGivenId: string;
        categories: (
          | {
              name: string;
              desc?: undefined;
            }
          | {
              name: string;
              desc: string;
            }
        )[];
        id: string | null | undefined;
      }[];
    }
    if (typeof aiArraysStr === 'object') {
      aiArrays = aiArraysStr as Record<string, unknown>[];
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      aiArrays = JSON.parse(aiArraysStr) as Record<string, unknown>[];
    }
    if (!responseStr || !aiArraysStr) {
      throw new UnauthorizedException('no data saved in redis');
    }

    const Resdata = response.map(async (value) => {
      const email = await this.prisma.eMAILS.findUnique({
        where: { gmailId: value.id! },
      });
      if (email) {
        console.log('email');
        return;
      }

      const aiData = aiArrays.find((val) => val.id === value.myGivenId);
      if (!aiData) {
        console.log('no ai data');
        return;
      }

      const score = this.getEmailPriorityScore(
        aiData.importance as number,
        aiData.urgency as number,
        aiData.senderImportance as number,
        aiData.deadline as string | null,
        aiData.requireAction as boolean,
        false,
        false,
      );

      const data = await this.prisma.eMAILS.create({
        data: {
          userId: userId,
          body: value.body,
          gmailId: value.id!,
          id: value.myGivenId,
          isRead: false,
          receivedAt: value.headers.recievedAt?.value
            ? new Date(value.headers.recievedAt.value)
            : new Date(Date.now()),
          sender: value.headers.from?.value ? value.headers.from?.value : '',
          subject: aiData.subject as string,
          category: aiData.category as string,
          aiPriority: aiData.priority as string,
          tags: aiData.tags as string[],
          GmailSubject: value.headers.subject?.value
            ? value.headers.subject.value
            : '',
          summary: aiData.summary as string,
          deadline:
            aiData.deadline === 'null' ||
            aiData.deadline === null ||
            aiData.deadline === '' ||
            aiData.deadline === ' '
              ? null
              : new Date(aiData.deadline as string),
          importance: aiData.importance as number,
          isCompleted: false,
          requiresAction: aiData.requireAction as boolean,
          senderImportance: aiData.senderImportance as number,
          urgency: aiData.urgency as number,
          priority: this.getEmailPrority(
            score,
            aiData.deadline as string | null,
          ),
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
      });
      return Promise.all(attach);
    });
    const user = await this.prisma.uSER.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return true;
    }
    this.SOCKET.sendUserEmailMsg(user.email);
    return Promise.all(Resdata);
  }

  getEmailPriorityScore(
    importance: number,
    urgency: number,
    senderImportance: number,
    deadline: string | null,
    requireAction: boolean,
    isRead: boolean,
    isCompleted: boolean,
  ) {
    let score = 0;

    score += importance * 4;
    score += urgency * 2;
    score += senderImportance * 2;

    if (requireAction) score += 10;

    if (!isRead) score += 5;

    score += this.deadlineScore(deadline);

    if (isCompleted) score = 0;

    return Math.min(score, 100);
  }

  deadlineScore(deadline: string | null) {
    if (!deadline) return 0;
    const deadlineDate = new Date(deadline);
    const todaysDate = new Date();

    todaysDate.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);

    const diffInMs = deadlineDate.getTime() - todaysDate.getTime();

    const days = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

    if (days >= 0 && days <= 1) return 30;

    if (days == 1) return 25;

    if (days == 2) return 20;

    if (days <= 5 && days > 0) return 15;

    if (days <= 10 && days > 0) return 10;

    if (days < 0) return 0;

    return 5;
  }

  getEmailPrority(score: number, deadline: string | null) {
    if (this.deadlineScore(deadline) === 0) {
      return 'Expired';
    }
    if (score > 0 && score <= 30) return 'Low';
    else if (score > 30 && score <= 50) return 'Meduim';
    else if (score > 50 && score <= 80) return 'High';
    else return 'Critical';
  }

  async changePriorities() {
    const data = await this.prisma.eMAILS.findMany({
      where: { priority: { in: ['Low', 'High', 'Critical', 'Meduim'] } },
    });

    const map = data.map(async (value) => {
      const score = this.getEmailPriorityScore(
        value.importance,
        value.urgency,
        value.senderImportance,
        value.deadline ? value.deadline.toLocaleDateString('en-CA') : null,
        value.requiresAction,
        value.isRead,
        value.isCompleted,
      );

      const priority = this.getEmailPrority(
        score,
        value.deadline ? value.deadline.toLocaleDateString('en-CA') : null,
      );

      return await this.prisma.eMAILS.update({
        where: { id: value.id },
        data: { priority: priority },
      });
    });

    return Promise.all(map);
  }

  async emailWorkflow(body: {
    accessToken: string;
    idToken: string;
    refreshToken: string;
    scope: string;
    year: string;
    historyId: string | null;
    email: string;
    categories: { name: string; id: string; userId: string }[];
    userId: string;
    not?: boolean;
  }) {
    const {
      accessToken,
      idToken,
      refreshToken,
      scope,
      year,
      historyId,
      email,
      categories,
      userId,
      not,
    } = body;

    const user = await this.prisma.uSER.findUnique({
      where: { email: email },
      include: { emails: {} },
    });

    if (!user) {
      return;
    }

    await this.getEmailsWorkflow(
      accessToken,
      idToken,
      refreshToken,
      year,
      historyId,
      email,
      scope,
      categories,
      userId,
      not,
    );
  }
}
