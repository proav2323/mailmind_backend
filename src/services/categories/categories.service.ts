import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { generateId } from '../../utils/generateId';

@Injectable()
export class CategoriesService {
  constructor(
    private JWT: JwtService,
    private prisma: PrismaService,
  ) {}

  async getUserCategories(req: Request, headers: Record<string, string>) {
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
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('user not found');
    }

    return await this.prisma.cATEGORIES.findMany({
      where: { userId: user.id },
      select: { name: true, id: true },
    });
  }

  async addCategory(
    req: Request,
    headers: Record<string, string>,
    name: string,
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
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('user not found');
    }

    const categories = await this.prisma.cATEGORIES.findMany({
      where: { name: name },
    });

    if (categories.length !== 0) {
      throw new BadRequestException('category found');
    }

    return await this.prisma.cATEGORIES.create({
      data: {
        userId: user.id,
        id: generateId(8),
        name: name,
      },
      select: { name: true, id: true },
    });
  }

  async deleteCategory(
    req: Request,
    headers: Record<string, string>,
    id: string,
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
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestException('user not found');
    }

    const category = await this.prisma.cATEGORIES.findUnique({
      where: { id: id },
      select: { userId: true },
    });

    if (!category) {
      throw new NotFoundException('category nto found');
    }

    if (category.userId !== user.id) {
      throw new UnauthorizedException('unathotized attempt to delete category');
    }

    return await this.prisma.cATEGORIES.delete({
      where: { id: id },
      select: { name: true, id: true },
    });
  }
}
