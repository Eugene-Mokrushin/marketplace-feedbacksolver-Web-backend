import { Injectable, OnModuleInit } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';

@Injectable()
export class SocketService implements OnModuleInit {
  public socketClient: Socket;

  constructor() {
    this.socketClient = io('http://localhost:2007');
  }

  onModuleInit() {
    this.socketClient.on('connet', () => {
      console.log('Connected to gateway');
    });
  }
}
