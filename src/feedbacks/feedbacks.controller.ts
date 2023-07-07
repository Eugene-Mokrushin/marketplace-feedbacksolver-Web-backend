import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { GetFeedbacksDto, ReplyDto, WBmanyDto } from './feedbacksDto';
import { FeedbacksService } from './feedbacks.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('feedbacks')
export class FeedbacksController {
  constructor(private feedbackService: FeedbacksService) {}

  @Post('get/wildberries')
  getWildberriesFeedbacks(@Body() dto: GetFeedbacksDto) {
    return this.feedbackService.getWildberriesFeedbacks(dto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('wildberries/answerFeedback/signle')
  wbAnswerFeedback(@Req() req: any, @Body() dto: ReplyDto) {
    const secretKey = req.tokenData.secretKey;
    return this.feedbackService.replyWildberriesFeedbackSingle(dto, secretKey);
  }

  @Post('post/allWildberries/:clientId')
  async initiateWebSocketConnection(@Body() dto: WBmanyDto) {
    return this.feedbackService.replyWildberriesFeedbackMultiple(dto);
  }
}
