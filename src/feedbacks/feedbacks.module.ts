import { Module } from '@nestjs/common';
import { FeedbacksService } from './feedbacks.service';
import { FeedbacksController } from './feedbacks.controller';
import { HttpModule } from '@nestjs/axios';
import { SharedModule } from '@/shared/shared.module';
import { OpenAIService } from '@/openai/openai.service';

@Module({
  imports: [HttpModule, SharedModule],
  controllers: [FeedbacksController],
  providers: [FeedbacksService, OpenAIService],
})
export class FeedbacksModule {}
