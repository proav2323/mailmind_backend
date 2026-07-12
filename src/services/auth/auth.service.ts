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
      throw new BadRequestException('token not valid');
    }
    console.log(token);

    const decoded = this.JWT.verify<{ email: string; accessToken: string }>(
      token,
    );

    const user = await this.prisma.uSER.findUnique({
      where: { email: decoded.email },
    });

    if (!user) {
      throw new BadRequestException('user not found');
    }

    return user;
  }

  async login(
    req: Request,
    body: {
      email: string;
      name: string;
      photoUrl: string;
      oAuthProvider: string;
    },
    res: Response,
  ) {
    const accessToken = (req as Request & { cookies?: Record<string, string> })
      .cookies?.accessToken;

    const email: string = body['email'];
    const name: string = body['name'];
    const photoUrl: string = body['photoUrl'];
    const oAuthProvider: string = body['oAuthProvider'];
    try {
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
      console.log(accessToken);

      const token = this.JWT.sign(
        { email: email, accessToken: accessToken },
        { expiresIn: '30m', secret: process.env.JWT_SECRET },
      );

      res.cookie('token', token);

      return token;
    } catch (err: any) {
      console.log(err);
      throw new BadRequestException('somethign went wrong');
    }
  }
}
