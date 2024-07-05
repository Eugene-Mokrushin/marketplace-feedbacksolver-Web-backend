import { FirebaseService } from '@/firebase/firebase.service';
import { LoggerService } from '@/log/logger.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  GetFeedbacksDto,
  KeyInterface,
  ReplyDto,
  FilteredFiveFeedback,
  WBmanyDto,
  FeedbackInterface,
  Template,
  GetQandFNumbersDto,
  MassReplyDto,
} from './feedbacksDto';
import { doc, getDoc } from 'firebase/firestore';
import { HttpService } from '@nestjs/axios';
import allRussianNames from '@/dump/realRussianNames';
import { WebsocketGateway } from '@/websocket/websocket.gateway';
import { SharedService } from '@/shared/shared.service';
import { OpenAIService } from '@/openai/openai.service';
import * as prompts from '@/models/ptompts.json';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class FeedbacksService {
  constructor(
    private websocketGateway: WebsocketGateway,
    private logger: LoggerService,
    private firebaseService: FirebaseService,
    private httpService: HttpService,
    private sharedService: SharedService,
    private openaiService: OpenAIService,
    private config: ConfigService,
  ) {}

  // async getWildberriesFeedbacks(GetFeedbacksDto: GetFeedbacksDto) {
  //   try {
  //     let secretKey = this.sharedService.decodeSecretKey(
  //       GetFeedbacksDto.secretKey,
  //     );
  //     if (!secretKey) {
  //       const organizationRef = doc(
  //         this.firebaseService.getFirestore(),
  //         'organizations',
  //         GetFeedbacksDto.organizationId,
  //       );
  //       const organizationDoc = await getDoc(organizationRef);
  //       if (organizationDoc.exists()) {
  //         const organizationData = organizationDoc.data();
  //         secretKey = this.getChangeKeys(
  //           organizationData.secret_keys,
  //           GetFeedbacksDto.marketplaceId,
  //         );
  //       } else {
  //         throw new HttpException(
  //           'No such organization or user was found',
  //           HttpStatus.NOT_FOUND,
  //         );
  //       }
  //     }
  //     if (!secretKey) {
  //       this.logger.error('No such marketplace or user or key was found');
  //       throw new HttpException(
  //         "You don't have permissions",
  //         HttpStatus.FORBIDDEN,
  //       );
  //     }
  //     const params = {
  //       isAnswered: GetFeedbacksDto.isAnswered,
  //       take: GetFeedbacksDto.take,
  //       skip: GetFeedbacksDto.skip,
  //       order: GetFeedbacksDto.isAsc ? 'dateAsc' : 'dateDesc',
  //     };
  //     const subdomain = '/api/v1/feedbacks';
  //     const strUrl = this.sharedService.buildUrl(
  //       'WILDBERRIES_FEEDBACKS_API',
  //       subdomain,
  //       params,
  //     );
  //     const feedbacksData = await this.sharedService.makeHttpRequest(
  //       this.httpService.get(strUrl.toString(), {
  //         headers: { Authorization: secretKey },
  //       }),
  //     );

  //     // const template = GetFeedbacksDto.templateId
  //     //   ? await this.getTemplateFile(GetFeedbacksDto.templateId)
  //     //   : null;

  //     const template = false;
  //     const feedbacks = feedbacksData.data.feedbacks as FeedbackInterface[];

  //     const feedbacksWithoutSuggestions = feedbacks.map((feedback) => {
  //       const {
  //         productDetails,
  //         userName,
  //         text,
  //         id,
  //         createdDate,
  //         photoLinks,
  //         productValuation,
  //       } = feedback;
  //       const brand = productDetails.brandName;
  //       const productName = productDetails.productName;
  //       const imtId = productDetails.imtId;
  //       const nmId = productDetails.nmId;
  //       const productLink = `https://www.wildberries.ru/catalog/${nmId}/detail.aspx`;
  //       return {
  //         itemId: imtId.toString(),
  //         nmId: nmId.toString(),
  //         feedbackId: id,
  //         feedback: text,
  //         media: null,
  //         score: productValuation,
  //         name: userName,
  //         feedbackDate: createdDate,
  //         productName,
  //         productLink,
  //         brand,
  //         userPhotos: photoLinks,
  //         suggestions: null,
  //       };
  //     });
  //     const productImages = await this.getProductImages(feedbacks, secretKey);
  //     feedbacksWithoutSuggestions.forEach((feedback, index) => {
  //       feedback.media = productImages[index];
  //     });
  //     if (template) {
  //       feedbacksWithoutSuggestions.forEach((feedback) => {
  //         const { suggestedResponses } = this.findResponsesInTemplateFile(
  //           feedback.itemId,
  //           feedback.brand,
  //           feedback.feedback,
  //           template,
  //           GetFeedbacksDto.isPersonalized,
  //           feedback.name,
  //         );
  //         feedback.suggestions = suggestedResponses;
  //       });
  //     }
  //     if (GetFeedbacksDto.aiModel) {
  //       const suggestions = await this.generateAIResponse(
  //         feedbacks,
  //         GetFeedbacksDto.isPersonalized,
  //         GetFeedbacksDto.numberOfSuggestions,
  //         GetFeedbacksDto.aiModel,
  //       );
  //       feedbacksWithoutSuggestions.forEach((feedback) => {
  //         const { reply } = suggestions.find(
  //           (item) => item[0].id.split('_')[0] === feedback.feedbackId,
  //         );
  //         feedback.suggestions = suggestedResponses;
  //       });
  //     }
  //     const token = this.sharedService.signToken({
  //       secretKey: this.sharedService.encodeSecretKey(secretKey),
  //     });
  //     // const token = 'token';
  //     return { data: feedbacksWithoutSuggestions, token };
  //   } catch (error) {
  //     this.logger.error(error);
  //     throw new HttpException('Error', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  // async replyWildberriesFeedbackMultiple(WBmanyDto: WBmanyDto) {
  //   const clientSocket = this.websocketGateway.getClientSocket(
  //     WBmanyDto.userId,
  //   );
  //   try {
  //     let secretKey = this.sharedService.decodeSecretKey(WBmanyDto.secretKey);
  //     await this.firebaseService.checkAccessRights(
  //       WBmanyDto.organizationId,
  //       WBmanyDto.userId,
  //       'admin',
  //     );
  //     if (!secretKey) {
  //       const organizationRef = doc(
  //         this.firebaseService.getFirestore(),
  //         'organizations',
  //         WBmanyDto.organizationId,
  //       );
  //       const organizationDoc = await getDoc(organizationRef);
  //       if (organizationDoc.exists()) {
  //         const organizationData = organizationDoc.data();
  //         secretKey = this.getChangeKeys(
  //           organizationData.secret_keys,
  //           WBmanyDto.marketplaceId,
  //         );
  //       } else {
  //         throw new HttpException(
  //           'No such organization or user was found',
  //           HttpStatus.NOT_FOUND,
  //         );
  //       }
  //     }
  //     const params = {
  //       isAnswered: false,
  //       take: 500,
  //       skip: 0,
  //       order: 'dateAsc',
  //     };
  //     const subdomain = '/api/v1/feedbacks';
  //     const strUrlGet = this.sharedService.buildUrl(
  //       'WILDBERRIES_FEEDBACKS_API',
  //       subdomain,
  //       params,
  //     );
  //     const feedbacksData = await this.sharedService.makeHttpRequest(
  //       this.httpService.get(strUrlGet.toString(), {
  //         headers: { Authorization: secretKey },
  //       }),
  //     );
  //     const loadedTemplateMock: Template[] = [
  //       {
  //         brand: 'Richard',
  //         response: 'test',
  //         articleWB: '123123412',
  //         triggers: ['test'],
  //         recommendation: ['test'],
  //         blacklistResponse: ['test'],
  //       },
  //     ];
  //     const feedbacksArray: FilteredFiveFeedback[] = (
  //       feedbacksData.data.feedbacks as FeedbackInterface[]
  //     )
  //       .filter((item) => item.productValuation === 5)
  //       .map((item) => {
  //         const {
  //           productDetails,
  //           userName,
  //           text,
  //           id,
  //           createdDate,
  //           imtId,
  //           photoLinks,
  //         } = item;
  //         const brandName = productDetails.brandName;
  //         const firstPhotoLink = photoLinks[0];
  //         let selectedTemplate: null | Template | Template[] = null;
  //         selectedTemplate = loadedTemplateMock.find((item) => {
  //           if (
  //             item.articleWB === imtId.toString() &&
  //             !this.handleTriggerWords(text, item.triggers)
  //           ) {
  //             return item;
  //           }
  //         });
  //         if (!selectedTemplate) {
  //           selectedTemplate = loadedTemplateMock.map((item) => {
  //             if (
  //               item.brand === brandName &&
  //               !this.handleTriggerWords(text, item.triggers)
  //             ) {
  //               return item;
  //             }
  //           });
  //         }
  //         if (!selectedTemplate) {
  //           return null;
  //         }
  //         if (Array.isArray(selectedTemplate)) {
  //           const randomIndex = Math.floor(
  //             Math.random() * selectedTemplate.length,
  //           );
  //           selectedTemplate = selectedTemplate[randomIndex];
  //         }

  //         const response = this.handleSuggestion(
  //           selectedTemplate.response,
  //           selectedTemplate.recommendation,
  //         );

  //         const ifPersonalized = WBmanyDto.personalizedResponse
  //           ? this.personalizeResponseTemplate(response, userName)
  //           : response;

  //         return {
  //           feedbackId: id,
  //           brand: brandName,
  //           user: userName,
  //           feedback: text,
  //           response: ifPersonalized,
  //           createdDate,
  //           firstPhotoLink: firstPhotoLink.miniSize,
  //         };
  //       })
  //       .filter((item) => item !== null);

  //     const numberOfFeedbacks = feedbacksArray.length;
  //     const promises = feedbacksArray.map(async (element) => {
  //       const body = {
  //         id: element.feedbackId,
  //         text: element.response,
  //       };
  //       const index = feedbacksArray.indexOf(element);
  //       const progress = {
  //         total: numberOfFeedbacks,
  //         current: index + 1,
  //         feedback: element.feedback,
  //         response: element.response,
  //         thumbPhoto: element.firstPhotoLink,
  //         createdDate: element.createdDate,
  //       };
  //       const subdomain = '/api/v1/feedbacks';
  //       const strUrlPutch = this.sharedService.buildUrl(
  //         'WILDBERRIES_FEEDBACKS_API',
  //         subdomain,
  //         {},
  //       );
  //       try {
  //         await this.sharedService.makeHttpRequest(
  //           this.httpService.patch(strUrlPutch.toString(), body, {
  //             headers: { Authorization: secretKey },
  //           }),
  //         );
  //         progress['errored'] = false;
  //         this.websocketGateway.updateProgress(clientSocket, progress);
  //       } catch (error) {
  //         this.logger.error(error);
  //         progress['errored'] = true;
  //         this.websocketGateway.updateProgress(clientSocket, progress);
  //       }
  //     });
  //     await Promise.all(promises);
  //     clientSocket.disconnect();
  //   } catch (error) {
  //     clientSocket.disconnect();
  //     throw new HttpException('Error', HttpStatus.BAD_REQUEST);
  //   }
  // }

  async getUptoDateQandFNumbers(QandFDto: GetQandFNumbersDto) {
    const organizationRef = doc(
      this.firebaseService.getFirestore(),
      'marketplaces',
      QandFDto.marketplaceId,
    );
    const organizationDoc = await getDoc(organizationRef);
    let secretKey = null;
    if (organizationDoc.exists()) {
      const organizationData = organizationDoc.data();
      if (organizationData.organizationId !== QandFDto.organizationId) {
        throw new HttpException(
          'No such organization or user was found',
          HttpStatus.NOT_FOUND,
        );
      }
      secretKey = this.sharedService.decodeSecretKey(organizationData.mainKey);
    }
    const subdomainFeedbacks = '/api/v1/feedbacks';
    const subdomainQuestions = '/api/v1/questions';
    const params = {
      isAnswered: true,
      take: 1,
      skip: 0,
      order: 'dateAsc',
    };
    const feedbackUrl = this.sharedService.buildUrl(
      'WILDBERRIES_FEEDBACKS_API',
      subdomainFeedbacks,
      params,
    );
    const questionsUrl = this.sharedService.buildUrl(
      'WILDBERRIES_FEEDBACKS_API',
      subdomainQuestions,
      params,
    );

    const [feedbacksData, questionsData] = await Promise.all([
      this.sharedService
        .makeHttpRequest(
          this.httpService.get(feedbackUrl.toString(), {
            headers: { Authorization: secretKey },
          }),
        )
        .then((res) => ({
          feedbacksUnanswered: res.data.countUnanswered,
          feedbacksAnswered: res.data.countArchive,
        })),
      this.sharedService
        .makeHttpRequest(
          this.httpService.get(questionsUrl.toString(), {
            headers: { Authorization: secretKey },
          }),
        )
        .then((res) => ({
          questionsUnanswered: res.data.countUnanswered,
          questionsAnswered: res.data.countArchive,
        })),
    ]);

    // Return both results
    return { feedbacksData, questionsData };
  }

  async massReplyFeedbacks(MassReplyDto: MassReplyDto, shopId: string) {
    // STEPS:
    // 0. Check for token
    // 1. Get feedbacks
    // 2. Filter feedbacks
    // 3. Generate responses
    // 4. Reply to feedbacks

    try {
      // 0. Check for token
      // const organizationRef = doc(
      //   this.firebaseService.getFirestore(),
      //   'marketplaces',
      //   shopId,
      // );
      // const organizationDoc = await getDoc(organizationRef);
      // let token = null;
      // if (organizationDoc.exists()) {
      //   const organizationData = organizationDoc.data();
      //   token = organizationData.mainKey;
      // } else {
      //   throw new HttpException(
      //     'No such organization or user was found',
      //     HttpStatus.NOT_FOUND,
      //   );
      // }
      const secretKey =
        'eyJhbGciOiJFUzI1NiIsImtpZCI6IjIwMjQwMjI2djEiLCJ0eXAiOiJKV1QifQ.eyJlbnQiOjEsImV4cCI6MTcyOTIxOTQ5NSwiaWQiOiJhYjlhYjIwOC0yNGZjLTQ3NjYtOTc5Ni1iZTAyZWNkZGE5ZjQiLCJpaWQiOjM2Njk1NzAzLCJvaWQiOjEzMjAxMjEsInMiOjEyOCwic2lkIjoiMzY5MmNiMGYtY2JmZS00ZmRmLTk3MTQtOWM1OTg2N2RhNzQ5IiwidCI6ZmFsc2UsInVpZCI6MzY2OTU3MDN9.h-vuFafLP0SlWrNBq0JPirhEY4elNAbrErYG0MzgI0ish9AuXP5DzhM9XNGgGKbwQAXyo_iSRDLUcbz8fsU_mw';
      this.logger.log('Mass reply started. Token confirmed');
      // 1. Get feedbacks
      const feedbacks = await this.getNFeedbacksWB(
        MassReplyDto.take,
        false,
        secretKey,
        MassReplyDto.isAsc,
      ).then((res) =>
        // 2. Filter feedbacks
        {
          this.logger.log(`Got ${res.length} feedbacks from WB`);
          return res.filter((item) => {
            if (MassReplyDto.withComment) {
              if (
                item.productValuation >= MassReplyDto.minEvaluation &&
                item.text
              ) {
                return item;
              }
            } else if (
              item.productValuation >= MassReplyDto.minEvaluation &&
              !item.text
            ) {
              return item;
            }
          });
        },
      );
      this.logger.log(`Got ${feedbacks.length} filtered feedbacks to reply`);

      // 3. Generate responses
      let suggestions: { id: string; reply: string }[] = [];
      // Split feedbacks into chunks of 100
      const chunkedFeedbacks = this.sharedService.chunkArray(
        feedbacks,
        80,
      ) as FeedbackInterface[][];
      // Generate suggestions for each chunk
      for (let i = 0; i < chunkedFeedbacks.length; i++) {
        const chunk = chunkedFeedbacks[i];
        this.logger.log(
          `Generating responses for chunk ${i + 1}/${chunkedFeedbacks.length}`,
        );
        // Skip chunk if it's not the first one and takes more than 1 minute to generate
        if (i !== 0) {
          await this.sharedService.delay(30001);
        }
        const chunkSuggestions = await this.generateAIResponse(
          chunk,
          MassReplyDto.isPersonalized,
          1,
          MassReplyDto.aiModel,
          MassReplyDto.emojiProbability,
        );
        // If response is array
        if (Array.isArray(chunkSuggestions)) {
          suggestions = suggestions.concat(chunkSuggestions);
          this.logger.log('Generated responses for chunk ' + (i + 1));
        } else {
          this.logger.warn('Chunk ' + (i + 1) + ' was skipped');
        }
      }
      this.logger.log('Got suggestions, n: ' + suggestions.length);

      // 4. Reply to feedbacks
      await this.replyFeedbacksWB(suggestions, secretKey);
      return { status: 'ok' };
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Error', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * Returns a list of suggested responses for each feedback.
   * @param toGenetate Feedbacks to generate responses for.
   * @param isPersonalized Whether to personalize the responses.
   * @param numSuggestions Number of suggestions to generate for each feedback.
   * @param model AI model to use for generating responses.
   * @param emojiProbability Probability of emoji to use in responses.
   * @returns List of suggested responses for each feedback as {id: string_INDEX, reply: string}[][].
   */
  private async generateAIResponse(
    toGenerate: FeedbackInterface[],
    isPersonalized: boolean,
    numSuggestions: number,
    model: 'gpt-3.5-turbo' | 'gpt-4',
    emojiProbability: number,
  ) {
    const responsesPromised = await Promise.all(
      toGenerate.map(async (feedback) => {
        const isValidUserName =
          isPersonalized && this.isNameValid(feedback.userName);
        const useEmoji = this.followProbability(emojiProbability);
        const responsePromises = Array.from({
          length: numSuggestions || 1,
        }).map(async (_, index) => ({
          id: feedback.id + '%' + index,
          reply: await this.openaiService.generateFeedbackReply(
            model,
            isPersonalized,
            {
              brand: feedback?.productDetails?.brandName,
              product_name: feedback?.productDetails?.productName,
              score: feedback.productValuation.toString(),
              feedback: feedback.text,
              buyer_name: isValidUserName ? feedback.userName : null,
              use_emoji: useEmoji,
            },
          ),
        }));
        return Promise.all(responsePromises);
      }),
    );
    // Flatten the nested arrays of promises and responses
    const responses = responsesPromised.flat();
    return responses;
  }

  /**
   * Returns a list of feedbacks from Wildberries.
   * @param nFeedbacks Number of feedbacks to return. Max 5000.
   * @param isAnswered Whether to return answered or unanswered feedbacks.
   * @param isAsc Whether to return feedbacks in ascending order. Default is descending.
   * @param token Token to use for authorization WB.
   * @returns List of feedbacks as FeedbackInterface[].
   */
  private async getNFeedbacksWB(
    nFeedbacks: number,
    isAnswered: boolean,
    token: string,
    isAsc = true,
  ) {
    const params = {
      isAnswered,
      take: nFeedbacks,
      skip: 0,
      order: isAsc ? 'dateAsc' : 'dateDesc',
    };
    const subdomain = '/api/v1/feedbacks';
    const strUrl = this.sharedService.buildUrl(
      'WILDBERRIES_FEEDBACKS_API',
      subdomain,
      params,
    );
    const feedbacksData = await this.sharedService.makeHttpRequest(
      this.httpService.get(strUrl.toString(), {
        headers: { Authorization: token },
      }),
    );
    return feedbacksData.data.feedbacks as FeedbackInterface[];
  }

  /**
   * @param feedbacks
   * @param token
   */
  private async replyFeedbacksWB(
    feedbacks: { id: string; reply: string }[],
    token: string,
  ) {
    try {
      // Split feedbacks into chunks of 50
      const chunkedFeedbacks = this.sharedService.chunkArray(feedbacks, 1) as {
        id: string;
        reply: string;
      }[][];
      // Reply to each chunk
      for (let i = 0; i < chunkedFeedbacks.length; i++) {
        const chunk = chunkedFeedbacks[i];
        this.logger.log(
          `Replying to chunk ${i + 1}/${chunkedFeedbacks.length}`,
        );
        const promises = chunk.map(async (element, j) => {
          const id = element?.id?.split('%')[0];
          const text = element?.reply?.replaceAll('/', '').replaceAll('\\', '');
          if (
            id &&
            text?.length > 10 &&
            text !== 'undefined' &&
            text !== 'null' &&
            text
          ) {
            const body = { id, text };
            const subdomain = '/api/v1/feedbacks';
            const strUrl = this.sharedService.buildUrl(
              'WILDBERRIES_FEEDBACKS_API',
              subdomain,
              {},
            );
            try {
              await this.sharedService.makeHttpRequest(
                this.httpService.patch(strUrl.toString(), body, {
                  headers: { Authorization: token },
                }),
              );
              this.logger.writeInLogDocument(
                'feedbackResponses',
                `id: ${id} || reply: ${text}`,
              );
              if (j / 10 === Math.floor(j / 10) && j !== 0) {
                this.logger.log(
                  `Replied to ${j} feedbacks out of ${chunk.length} in chunk ${
                    i + 1
                  }`,
                );
              }
            } catch (error) {
              this.logger.error(error);
            }
          }
        });
        await Promise.all(promises);
        this.logger.log('Replied to chunk ' + (i + 1));
        await this.sharedService.delay(300);
      }
      return 0;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Error', HttpStatus.BAD_REQUEST);
    }
  }

  private getChangeKeys(keys: KeyInterface[], marketplaceToLook: string) {
    const secretKey = keys.find((key) => key.uid === marketplaceToLook);
    return secretKey.change_key || null;
  }

  /**
   * Returns whether the given name is valid.
   * @userName Name to check.
   *
   */
  private isNameValid(userName: string): boolean {
    const capitalizedUserName =
      userName.toLowerCase().charAt(0).toUpperCase() +
      userName.toLowerCase().slice(1);
    let low = 0;
    let high = allRussianNames.length - 1;
    let foundName = null;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const name = allRussianNames[mid];
      if (name === capitalizedUserName) {
        foundName = name;
        break;
      }
      if (name < capitalizedUserName) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    if (!foundName) {
      return false;
    } else {
      return true;
    }
  }

  private personalizeResponseTemplate(text: string, userName: string): string {
    const isValidUserName = this.isNameValid(userName);
    if (!isValidUserName) {
      return text;
    } else {
      return userName + ', ' + text.charAt(0).toLowerCase() + text.slice(1);
    }
  }

  private handleTriggerWords(text: string, triggerWords: string[]): boolean {
    const triggerWordsPattern = new RegExp(`(${triggerWords.join('|')})`, 'gi');
    return triggerWordsPattern.test(text);
  }

  private handleSuggestion(text: string, suggestions: string[]): string {
    const suggestionsPattern = /r\{(\d+)\}/g;
    const suggestionsArray = suggestions;
    return suggestionsPattern.test(text)
      ? text.replace(suggestionsPattern, (_, number) => {
          const numSuggestions = Math.min(
            Number(number),
            suggestionsArray.length,
          );
          if (numSuggestions === 0 || suggestionsArray.length === 0) {
            return '';
          } else if (numSuggestions > suggestionsArray.length) {
            return suggestionsArray.join(', ');
          } else {
            const randomSuggestions = [];
            for (let i = 0; i < numSuggestions; i++) {
              const randomIndex = Math.floor(
                Math.random() * suggestionsArray.length,
              );
              randomSuggestions.push(suggestionsArray[randomIndex]);
              suggestionsArray.splice(randomIndex, 1);
            }
            return randomSuggestions.join(', ');
          }
        })
      : text;
  }

  private async getTemplateFile(templateId: string) {
    const templateRef = doc(
      this.firebaseService.getFirestore(),
      'templates',
      templateId,
    );
    const templateDoc = await getDoc(templateRef);
    if (templateDoc.exists()) {
      return JSON.parse(templateDoc.data().rawData);
    }
    return null;
  }

  private findResponsesInTemplateFile(
    articleWB: string,
    brand: string,
    feedback: string,
    template: Template[],
    isPersonalized: boolean | null,
    userName: string,
  ) {
    const handleResponse = (template: Template) => {
      const randomIndexBlacklist = Math.floor(
        Math.random() * template.blacklistResponse.length,
      );
      const response = this.handleSuggestion(
        this.handleTriggerWords(feedback, template.triggers)
          ? template.blacklistResponse[randomIndexBlacklist]
          : template.response,
        template.recommendation,
      );
      return isPersonalized
        ? this.personalizeResponseTemplate(response, userName)
        : response;
    };

    let primaryResponse = template.find((item) => {
      if (item.articleWB === articleWB) {
        return handleResponse(item);
      }
    });
    const secondaryResponses = template.filter((item) => {
      if (item.brand === brand && item.articleWB !== articleWB) {
        return handleResponse(item);
      }
    });
    if (!primaryResponse) {
      primaryResponse = secondaryResponses[0];
      secondaryResponses.splice(0, 1);
    }

    return {
      suggestedResponses: {
        primary: primaryResponse,
        secondary: secondaryResponses,
      },
    };
  }

  private async getProductImages(
    feedbacks: FeedbackInterface[],
    secretKey: string,
  ) {
    try {
      const productImagesPromises = feedbacks.map((feedback) => {
        const { imtId } = feedback.productDetails;

        const body = {
          sort: {
            cursor: {
              limit: 1,
            },
            filter: {
              withPhoto: -1,
              imtID: imtId,
            },
          },
        };
        const res = this.sharedService.makeHttpRequest(
          this.httpService.post(
            'https://suppliers-api.wildberries.ru/content/v1/cards/cursor/list',
            JSON.stringify(body),
            {
              headers: { Authorization: secretKey },
            },
          ),
        );
        return res;
      });
      const productImages = await Promise.all(productImagesPromises);
      return productImages.map((item) => {
        return item.data.cards.length > 0
          ? item.data.cards[0].mediaFiles
          : null;
      });
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  private followProbability(probability: number): boolean {
    const random = Math.random();
    return random <= probability;
  }
}
