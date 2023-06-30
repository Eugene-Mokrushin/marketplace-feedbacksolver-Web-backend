import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeedbacksModule } from './feedbacks/feedbacks.module';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from './logger/logger.module';
import { FirebaseModule } from './firebase/firebase.module';
import { TemplatesModule } from './templates/templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot(),
    FirebaseModule.forRoot(),
    FeedbacksModule,
    AuthModule,
    TemplatesModule,
  ],
})
export class AppModule {}
