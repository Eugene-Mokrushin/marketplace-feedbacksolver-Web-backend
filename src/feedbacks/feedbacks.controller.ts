import { Body, Controller, Post } from '@nestjs/common';
import { GetFeedbacksDto, ReplyDto, WBmanyDto } from './feedbacksDto';
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

  @Post('post/allWildberries/:clientId')
  async initiateWebSocketConnection(@Body() dto: WBmanyDto) {
    return this.feedbackService.replyWildberriesFeedbackMultiple(dto);
  }
}
