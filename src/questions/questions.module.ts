import { Module } from '@nestjs/common';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { HttpModule } from '@nestjs/axios';
import { SharedModule } from '@/shared/shared.module';
import { OpenAIService } from '@/openai/openai.service';

@Module({
  imports: [HttpModule, SharedModule],
  controllers: [QuestionsController],
  providers: [QuestionsService, OpenAIService],
})
export class QuestionsModule {}
