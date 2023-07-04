import { Body, Controller, Post } from '@nestjs/common';
import { GetFeedbacksDto, ReplyDto } from './feedbacksDto';
import { FeedbacksService } from './feedbacks.service';

@Controller('feedbacks')
export class FeedbacksController {
  constructor(private feedbackService: FeedbacksService) {}

  @Post('get/wildberries')
  getWildberriesFeedbacks(@Body() dto: GetFeedbacksDto) {
    return this.feedbackService.getWildberriesFeedbacks(dto);
  }

  @Post('post/wildberries')
  postWildeberriesFeedbacks(@Body() dto: ReplyDto) {
    return this.feedbackService.replyWildberriesFeedbackSingle(dto);
  }
}
