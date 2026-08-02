import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(private JWT: JwtService) {}
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
    if (decoded && decoded.email) {
      client.disconnect();
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await client.leave(decoded.email);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    await client.join(decoded.email);
    console.log('client connected');
  }

  handleDisconnect(client: Socket) {
    client.disconnect();
    console.log('client disconnected');
  }
}
