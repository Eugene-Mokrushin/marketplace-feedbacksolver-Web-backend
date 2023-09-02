import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
  private readonly baseUrl = 'https://api.openai.com/v1/chat/completions';
  private readonly openai = new OpenAI();
  constructor(private readonly httpService: HttpService) {}
  async getResponseV3p5(
    promptUser: string,
    promptSystem: string,
  ): Promise<string> {
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: promptSystem },
          { role: 'user', content: promptUser },
        ],
        temperature: 0.4,
        max_tokens: 650,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
      });
      return chatCompletion.choices[0].message.content;
    } catch (error) {
      console.log(error);
      return error;
    }
  }
  async getResponseV4(
    promptUser: string,
    promptSystem: string,
  ): Promise<string> {
    try {
      const chatCompletion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: promptSystem },
          { role: 'user', content: promptUser },
        ],
        temperature: 0.4,
        max_tokens: 650,
        frequency_penalty: 0.5,
        presence_penalty: 0.5,
      });
      return chatCompletion.choices[0].message.content;
    } catch (error) {
      console.log(error);
      return error;
    }
  }
}
