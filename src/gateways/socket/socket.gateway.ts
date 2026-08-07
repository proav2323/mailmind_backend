import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../services/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

@WebSocketGateway({ cors: true })
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private JWT: JwtService,
    private prisma: PrismaService,
  ) {}
  @WebSocketServer()
  server!: Server;

  sendUserEmailMsg(email: string) {
    this.server.to(email).emit('newEmail');
  }

  sendUserEmailLoading(email: string) {
    this.server.to(email).emit('emailLoading');
  }

  async handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.headers.authorization as string);
    if (
      !token ||
      token === undefined ||
      token === null ||
      token === '' ||
      token === 'undefined' ||
      token === 'null'
    ) {
      client.disconnect();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const decoded = this.JWT.verify(token, {
      secret: process.env.JWT_SECRET,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!decoded && !decoded.email) {
      client.disconnect();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await client.leave(decoded.email);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await client.join(decoded.email);
    const platform = client.handshake.query.platform;
    await this.prisma.uSER.update({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where: { email: decoded.email as string },
      data: {
        sessions: {
          push: { clientId: client.id, platform: platform ?? 'web' },
        },
      },
    });
    console.log('client connected');
  }

  async handleDisconnect(client: Socket) {
    const token =
      (client.handshake.auth?.token as string) ||
      (client.handshake.headers.authorization as string);
    if (
      !token ||
      token === undefined ||
      token === null ||
      token === '' ||
      token === 'undefined' ||
      token === 'null'
    ) {
      client.disconnect();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const decoded = this.JWT.verify(token, {
      secret: process.env.JWT_SECRET,
    });
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!decoded && !decoded.email) {
      client.disconnect();
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await client.leave(decoded.email);

    const user = await this.prisma.uSER.findUnique({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where: { email: decoded.email as string },
    });
    if (!user) {
      client.disconnect();
      return;
    }
    const newSessions = user.sessions.filter(
      (value) => value!['clientId'] !== client.id,
    );

    await this.prisma.uSER.update({
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      where: { email: decoded.email as string },
      data: {
        sessions: newSessions as Prisma.InputJsonValue[],
      },
    });
    console.log('client disconnected');
  }
}
