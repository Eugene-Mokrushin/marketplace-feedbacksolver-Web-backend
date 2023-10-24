import { Injectable } from '@nestjs/common';
import { OpenAI } from 'langchain/llms/openai';
import { PromptTemplate } from 'langchain/prompts';
import { LoggerService } from '@/log/logger.service';
import { FeedbackParams } from './openaiTypes';

@Injectable()
export class OpenAIService {
  constructor(private logger: LoggerService) {}

  /**
   *
   * @param modelName Model of LLM to use (OpenAI)
   * @param isPersonalized Is the reply personalized
   * @param feedbackParams Feedback parameters e.g. brand, product_name, score, feedback, buyer_name
   * @returns Generated string reply
   */
  async generateFeedbackReply(
    modelName: 'gpt-3.5-turbo' | 'gpt-4',
    isPersonalized: boolean,
    feedbackParams: FeedbackParams,
  ) {
    try {
      const llm = new OpenAI({
        modelName,
        temperature: 0,
        maxTokens: 200,
        frequencyPenalty: 0.5,
        presencePenalty: 0.5,
      });
      const prompt = new PromptTemplate({
        inputVariables: [
          'brand',
          'product_name',
          'score',
          'feedback',
          'buyer_name',
        ],
        template: `Ты представитель бренда {brand}, один из многих продавцов, который продает товары на маркетплейсе. Твоя задача ответить на отзыв. Будь менее официален но обращайся на Вы, уложись масимум в 40-60 слов. Не упоминай про маркетплейс и название купленного продукта, не перефразируй название продукта! На товар {product_name}, бренда {brand} поступил отзыв, с оценкой {score} из 5. Отзыв: {feedback}. ${
          isPersonalized && feedbackParams.buyer_name
            ? 'Обратись к пользователю по имени {buyer_name}.'
            : ''
        }`,
      });

      const formatedPrompt = await prompt.format({
        brand: feedbackParams.brand,
        product_name: feedbackParams.product_name,
        score: feedbackParams.score,
        feedback: feedbackParams.feedback,
        buyer_name: feedbackParams.buyer_name,
      });

      console.log(formatedPrompt);

      const reply = await llm.call(formatedPrompt, { timeout: 30000 });
      return reply;
    } catch (error) {
      this.logger.error(error);
      return error;
    }
  }
}
