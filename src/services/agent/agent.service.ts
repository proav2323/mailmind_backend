import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { generateId } from '../../utils/generateId';
import { firstValueFrom, NotFoundError } from 'rxjs';
import { RedisService } from '../redis/redis.service';
import { HttpService } from '@nestjs/axios';

@Injectable()
export class AgentService {
  constructor(
    private prisma: PrismaService,
    private JWT: JwtService,
    private redis: RedisService,
    private http: HttpService,
  ) {}
  async createChat(req: Request, headers: Record<string, string>) {
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
      select: { email: true, refreshToken: true },
    });

    if (!user) {
      throw new BadRequestException('user not found');
    }

    const data = await this.prisma.uSER.update({
      where: { email: user.email },
      data: {
        addEmailChats: { create: { id: generateId(8), messages: [] } },
      },
      select: {
        id: true,
        created_at: true,
        messages: true,
        updated_at: true,
        userId: true,
        user: false,
      },
    });

    return data;
  }

  async Chat(
    req: Request,
    headers: Record<string, string>,
    query: string,
    emailId?: string,
  ) {
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
      select: { email: true, id: true },
    });

    if (!user) {
      throw new BadRequestException('user not found');
    }

    let emailDraft: {
      messages: any[];
      id: string;
      created_at: Date;
      updated_at: Date;
      userId: string;
    } | null = null;

    if (emailId) {
      emailDraft = await this.prisma.newEmailChats.findUnique({
        where: { id: emailId },
        select: {
          id: true,
          created_at: true,
          messages: true,
          updated_at: true,
          userId: true,
          user: false,
        },
      });
    } else {
      emailDraft = await this.createChat(req, headers);
    }

    if (!emailDraft) {
      throw new NotFoundError('email not found from this id');
    }

    this.redis.save(JSON.stringify(emailDraft.messages), emailDraft.id);

    await firstValueFrom(
      this.http.get(`https://mailmingaiwakingfix.vercel.app/wake`, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 300000,
      }),
    );
    await firstValueFrom(
      this.http.post(
        `${process.env.AI_BACKEND_URL}/write`,
        {
          messageId: emailDraft.id,
          userId: user.id,
          query: query,
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 300000,
        },
      ),
    );

    const messagesStr = await this.redis.get(emailDraft.id);
    const messages = JSON.parse(messagesStr);
    await this.prisma.newEmailChats.update({
      where: { id: emailDraft.id },
      data: { messages: messages },
    });

    return { success: 'true' };
  }
}
