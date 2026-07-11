import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';
import { prisma } from 'src/prisma';
import { generateId } from 'src/utils/generateId';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(private JWT: JwtService) {}
  async auth(req: Request) {
    const token = (req as Request & { cookies?: Record<string, string> })
      .cookies?.token;

    if (!token) {
      throw new BadRequestException('token not valid');
    }

    const decoded = this.JWT.verify<{ email: string; accessToken: string }>(
      token,
    );

    const user = await prisma.uSER.findUnique({
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

    const user = await prisma.uSER.findUnique({ where: { email: email } });

    if (!user) {
      await prisma.uSER.create({
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
      { email: email, accessToken: accessToken },
      { expiresIn: '30m' },
    );

    res.cookie('token', token);

    return token;
  }
}
