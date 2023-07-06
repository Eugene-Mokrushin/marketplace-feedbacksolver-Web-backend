import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeedbacksModule } from './feedbacks/feedbacks.module';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from './log/logger.module';
import { FirebaseModule } from './firebase/firebase.module';
import { TemplatesModule } from './templates/templates.module';
import { InterfaceModule } from './interface/interface.module';
import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(),
    FirebaseModule.forRoot(),
    WebsocketModule.forRoot(),
    FeedbacksModule,
    AuthModule,
    TemplatesModule,
    InterfaceModule,
  ],
})
export class AppModule {}
