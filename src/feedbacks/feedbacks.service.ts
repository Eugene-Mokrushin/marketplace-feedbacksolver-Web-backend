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
} from './feedbacksDto';
import { doc, getDoc, or } from 'firebase/firestore';
import { HttpService } from '@nestjs/axios';
import allRussianNames from '@/dump/realRussianNames';
import { WebsocketGateway } from '@/websocket/websocket.gateway';
import { SharedService } from '@/shared/shared.service';
import { OpenAIService } from '@/openai/openai.service';

@Injectable()
export class FeedbacksService {
  constructor(
    private websocketGateway: WebsocketGateway,
    private logger: LoggerService,
    private firebaseService: FirebaseService,
    private httpService: HttpService,
    private sharedService: SharedService,
    private openaiService: OpenAIService,
  ) {}

  async getWildberriesFeedbacks(GetFeedbacksDto: GetFeedbacksDto) {
    try {
      let secretKey = this.sharedService.decodeSecretKey(
        GetFeedbacksDto.secretKey,
      );
      if (!secretKey) {
        const organizationRef = doc(
          this.firebaseService.getFirestore(),
          'organizations',
          GetFeedbacksDto.organizationId,
        );
        const organizationDoc = await getDoc(organizationRef);
        if (organizationDoc.exists()) {
          const organizationData = organizationDoc.data();
          secretKey = this.getChangeKeys(
            organizationData.secret_keys,
            GetFeedbacksDto.marketplaceId,
          );
        } else {
          throw new HttpException(
            'No such organization or user was found',
            HttpStatus.NOT_FOUND,
          );
        }
      }
      if (!secretKey) {
        this.logger.error('No such marketplace or user or key was found');
        throw new HttpException(
          "You don't have permissions",
          HttpStatus.FORBIDDEN,
        );
      }
      const params = {
        isAnswered: GetFeedbacksDto.isAnswered,
        take: GetFeedbacksDto.take,
        skip: GetFeedbacksDto.skip,
        order: GetFeedbacksDto.isAsc ? 'dateAsc' : 'dateDesc',
      };
      const subdomain = '/api/v1/feedbacks';
      const strUrl = this.sharedService.buildUrl(
        'WILDBERRIES_FEEDBACKS_API',
        subdomain,
        params,
      );
      const feedbacksData = await this.sharedService.makeHttpRequest(
        this.httpService.get(strUrl.toString(), {
          headers: { Authorization: secretKey },
        }),
      );

      // const template = GetFeedbacksDto.templateId
      //   ? await this.getTemplateFile(GetFeedbacksDto.templateId)
      //   : null;

      const template = false;
      const feedbacks = feedbacksData.data.feedbacks as FeedbackInterface[];

      const feedbacksWithoutSuggestions = feedbacks.map((feedback) => {
        const {
          productDetails,
          userName,
          text,
          id,
          createdDate,
          photoLinks,
          productValuation,
        } = feedback;
        const brand = productDetails.brandName;
        const productName = productDetails.productName;
        const imtId = productDetails.imtId;
        const nmId = productDetails.nmId;
        const productLink = `https://www.wildberries.ru/catalog/${nmId}/detail.aspx`;
        return {
          itemId: imtId.toString(),
          nmId: nmId.toString(),
          feedbackId: id,
          feedback: text,
          media: null,
          score: productValuation,
          name: userName,
          feedbackDate: createdDate,
          productName,
          productLink,
          brand,
          userPhotos: photoLinks,
          suggestions: null,
        };
      });
      const productImages = await this.getProductImages(feedbacks, secretKey);
      feedbacksWithoutSuggestions.forEach((feedback, index) => {
        feedback.media = productImages[index];
      });
      if (template) {
        feedbacksWithoutSuggestions.forEach((feedback) => {
          const { suggestedResponses } = this.findResponsesInTemplateFile(
            feedback.itemId,
            feedback.brand,
            feedback.feedback,
            template,
            GetFeedbacksDto.isPersonalized,
            feedback.name,
          );
          feedback.suggestions = suggestedResponses;
        });
      }
      if (GetFeedbacksDto.aiModel && GetFeedbacksDto.aiModel === 'gpt-3.5') {
        const suggestionsPromises = feedbacksWithoutSuggestions.map(
          (feedback) => {
            const isValidUserName =
              GetFeedbacksDto.isPersonalized && this.isNameValid(feedback.name);
            const promptUser = `На товар ${feedback.productName}, бренда ${feedback.brand} поступил отзыв, с оценкой ${feedback.score} из 5. Отзыв: ${feedback.feedback}.`;
            const promptSystem = `Ты представитель бренда ${
              feedback.brand
            }, которая продает товары на маркетплейсе под названием "Wildberries". Твоя задача ответить на отзыв. Будь менее официален но обращайся на Вы, уложись масимум в 50 слов${
              isValidUserName
                ? ', обратись к пользователю по имени ' + feedback.name
                : ''
            }.`;
            return Promise.all(
              Array.from({
                length: GetFeedbacksDto.numberOfSuggestions
                  ? GetFeedbacksDto.numberOfSuggestions
                  : 1,
              }).map(() => {
                return this.openaiService.getResponseV3p5(
                  promptUser,
                  promptSystem,
                );
              }),
            );
          },
        );
        const suggestions = await Promise.all(suggestionsPromises);
        feedbacksWithoutSuggestions.forEach((feedback, index) => {
          const idedSuggestions = suggestions[index].map((item, index) => {
            return {
              id: feedback.feedbackId + '_' + index,
              text: item,
            };
          });

          feedback.suggestions = idedSuggestions;
        });
      }
      const token = this.sharedService.signToken({
        secretKey: this.sharedService.encodeSecretKey(secretKey),
      });
      // const token = 'token';
      return { data: feedbacksWithoutSuggestions, token };
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async replyWildberriesFeedbackSingle(
    ReplyDto: ReplyDto,
    secretKeyEncrypted: string,
  ) {
    try {
      // const secretKey = this.sharedService.decodeSecretKey(secretKeyEncrypted);
      // if (!secretKey) {
      //   throw new HttpException(
      //     'No such marketplace or user or key was found',
      //     HttpStatus.FORBIDDEN,
      //   );
      // }
      // const body = {
      //   id: ReplyDto.feedbackId,
      //   text: ReplyDto.replyText,
      // };
      // const subdomain = '/api/v1/feedbacks';
      // const strUrl = this.sharedService.buildUrl('WILDBERRIES_FEEDBACKS_API', subdomain, {});
      // await this.sharedService.makeHttpRequest(
      //   this.httpService.patch(strUrl.toString(), body, {
      //     headers: { Authorization: secretKey },
      //   }),
      // );
      return { status: 'ok' };
    } catch (error) {
      this.logger.error(error);
      throw new HttpException('Error', HttpStatus.BAD_REQUEST);
    }
  }

  async replyWildberriesFeedbackMultiple(WBmanyDto: WBmanyDto) {
    const clientSocket = this.websocketGateway.getClientSocket(
      WBmanyDto.userId,
    );
    try {
      let secretKey = this.sharedService.decodeSecretKey(WBmanyDto.secretKey);
      await this.firebaseService.checkAccessRights(
        WBmanyDto.organizationId,
        WBmanyDto.userId,
        'admin',
      );
      if (!secretKey) {
        const organizationRef = doc(
          this.firebaseService.getFirestore(),
          'organizations',
          WBmanyDto.organizationId,
        );
        const organizationDoc = await getDoc(organizationRef);
        if (organizationDoc.exists()) {
          const organizationData = organizationDoc.data();
          secretKey = this.getChangeKeys(
            organizationData.secret_keys,
            WBmanyDto.marketplaceId,
          );
        } else {
          throw new HttpException(
            'No such organization or user was found',
            HttpStatus.NOT_FOUND,
          );
        }
      }
      const params = {
        isAnswered: false,
        take: 500,
        skip: 0,
        order: 'dateAsc',
      };
      const subdomain = '/api/v1/feedbacks';
      const strUrlGet = this.sharedService.buildUrl(
        'WILDBERRIES_FEEDBACKS_API',
        subdomain,
        params,
      );
      const feedbacksData = await this.sharedService.makeHttpRequest(
        this.httpService.get(strUrlGet.toString(), {
          headers: { Authorization: secretKey },
        }),
      );
      const loadedTemplateMock: Template[] = [
        {
          brand: 'Richard',
          response: 'test',
          articleWB: '123123412',
          triggers: ['test'],
          recommendation: ['test'],
          blacklistResponse: ['test'],
        },
      ];
      const feedbacksArray: FilteredFiveFeedback[] = (
        feedbacksData.data.feedbacks as FeedbackInterface[]
      )
        .filter((item) => item.productValuation === 5)
        .map((item) => {
          const {
            productDetails,
            userName,
            text,
            id,
            createdDate,
            imtId,
            photoLinks,
          } = item;
          const brandName = productDetails.brandName;
          const firstPhotoLink = photoLinks[0];
          let selectedTemplate: null | Template | Template[] = null;
          selectedTemplate = loadedTemplateMock.find((item) => {
            if (
              item.articleWB === imtId.toString() &&
              !this.handleTriggerWords(text, item.triggers)
            ) {
              return item;
            }
          });
          if (!selectedTemplate) {
            selectedTemplate = loadedTemplateMock.map((item) => {
              if (
                item.brand === brandName &&
                !this.handleTriggerWords(text, item.triggers)
              ) {
                return item;
              }
            });
          }
          if (!selectedTemplate) {
            return null;
          }
          if (Array.isArray(selectedTemplate)) {
            const randomIndex = Math.floor(
              Math.random() * selectedTemplate.length,
            );
            selectedTemplate = selectedTemplate[randomIndex];
          }

          const response = this.handleSuggestion(
            selectedTemplate.response,
            selectedTemplate.recommendation,
          );

          const ifPersonalized = WBmanyDto.personalizedResponse
            ? this.personalizeResponseTemplate(response, userName)
            : response;

          return {
            feedbackId: id,
            brand: brandName,
            user: userName,
            feedback: text,
            response: ifPersonalized,
            createdDate,
            firstPhotoLink: firstPhotoLink.miniSize,
          };
        })
        .filter((item) => item !== null);

      const numberOfFeedbacks = feedbacksArray.length;
      const promises = feedbacksArray.map(async (element) => {
        const body = {
          id: element.feedbackId,
          text: element.response,
        };
        const index = feedbacksArray.indexOf(element);
        const progress = {
          total: numberOfFeedbacks,
          current: index + 1,
          feedback: element.feedback,
          response: element.response,
          thumbPhoto: element.firstPhotoLink,
          createdDate: element.createdDate,
        };
        const subdomain = '/api/v1/feedbacks';
        const strUrlPutch = this.sharedService.buildUrl(
          'WILDBERRIES_FEEDBACKS_API',
          subdomain,
          {},
        );
        try {
          await this.sharedService.makeHttpRequest(
            this.httpService.patch(strUrlPutch.toString(), body, {
              headers: { Authorization: secretKey },
            }),
          );
          progress['errored'] = false;
          this.websocketGateway.updateProgress(clientSocket, progress);
        } catch (error) {
          this.logger.error(error);
          progress['errored'] = true;
          this.websocketGateway.updateProgress(clientSocket, progress);
        }
      });
      await Promise.all(promises);
      clientSocket.disconnect();
    } catch (error) {
      clientSocket.disconnect();
      throw new HttpException('Error', HttpStatus.BAD_REQUEST);
    }
  }

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

  private getChangeKeys(keys: KeyInterface[], marketplaceToLook: string) {
    const secretKey = keys.find((key) => key.uid === marketplaceToLook);
    return secretKey.change_key || null;
  }

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
}
