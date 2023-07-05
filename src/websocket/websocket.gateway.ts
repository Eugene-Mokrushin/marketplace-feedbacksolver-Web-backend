import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit } from '@nestjs/common';

@WebSocketGateway()
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private clients: Socket[] = [];

  // onModuleInit() {
  //   this.server.on('connection', (socket) => {
  //     console.log(socket.id);
  //     console.log('Conneted 1');
  //   });
  // }

  handleConnection(client: Socket) {
    console.log('Client connected:', client.id);
    this.clients.push(client);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
    this.clients = this.clients.filter((c) => c !== client);
  }

  async initiateWebSocketConnection(): Promise<Socket> {
    console.log(this.clients);
    if (this.clients.length > 0) {
      const client = this.clients[0];
      // Close any existing connection
      client.disconnect();

      return new Promise<Socket>((resolve) => {
        client.on('connect', () => {
          // Initiate the WS connection
          client.emit('connectionInitiated', 'WS connection initiated.');

          resolve(client);
        });
      });
    } else {
      throw new Error('No clients connected.');
    }
  }
}
