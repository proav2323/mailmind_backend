import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  @SubscribeMessage('sendEmailMsg')
  handleMessage(email: string) {
    this.server.to(email).emit('newEmail');
  }

  handleConnection(client: Socket) {
    const token = client.handshake.auth.token as string;
    if (!token) {
      client.disconnect();
    }
    // verify token
    // let decoded user
    // this.server.socketsJoin(decoded.email);
  }

  handleDisconnect(client: Socket) {
    client.disconnect();
  }
}
