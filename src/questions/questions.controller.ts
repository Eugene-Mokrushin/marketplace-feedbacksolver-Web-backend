import { Body, Controller, Post } from '@nestjs/common';
import { QuestionsService } from './questions.service';
import { SampleDto } from './questionsDto';

@Controller('questions')
export class QuestionsController {
  constructor(private questionService: QuestionsService) {}

  @Post('sample')
  getSample(@Body() dto: SampleDto) {
    if (dto.type === 'wildberries') {
      return this.questionService.getSampleWildberries(dto);
    }
  }
}
