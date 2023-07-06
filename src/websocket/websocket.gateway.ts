import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway(2007, { cors: { origin: '*' } })
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
    console.log('Client connected 1:', client.id);
    this.clients.push(client);
    client.emit('id', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected:', client.id);
    this.clients = this.clients.filter((c) => c !== client);
    console.log(this.clients);
  }

  getClientSocket(clientId: string) {
    return this.clients.find((client) => client.id === clientId);
  }

  updateProgress(client: Socket, progress: number) {
    // Emit the progress event to the specific client
    client.emit('progress', progress);
  }
}
