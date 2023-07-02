import { Body, Controller, Post } from '@nestjs/common';
import { GetFeedbacksDto } from './feedbacksDto';
import { FeedbacksService } from './feedbacks.service';

@Controller('feedbacks')
export class FeedbacksController {
  constructor(private feedbackService: FeedbacksService) {}

  @Post('wildberries')
  getWildberriesFeedbacks(@Body() dto: GetFeedbacksDto) {
    return this.feedbackService.getWildberriesFeedbacks(dto);
  }
}
