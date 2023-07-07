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
} from './feedbacksDto';
import { doc, getDoc } from 'firebase/firestore';
import { HttpService } from '@nestjs/axios';
import allRussianNames from '@/dump/realRussianNames';
import { WebsocketGateway } from '@/websocket/websocket.gateway';
import { SharedService } from '@/shared/shared.service';

@Injectable()
export class FeedbacksService {
  constructor(
    private websocketGateway: WebsocketGateway,
    private logger: LoggerService,
    private firebaseService: FirebaseService,
    private httpService: HttpService,
    private sharedService: SharedService,
  ) {}

  async getWildberriesFeedbacks(GetFeedbacksDto: GetFeedbacksDto) {
    try {
      let secretKey = this.sharedService.decodeSecretKey(
        GetFeedbacksDto.secretKey,
      );
      await this.firebaseService.checkAccessRights(
        GetFeedbacksDto.organizationId,
        GetFeedbacksDto.userId,
        'admin',
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
        take: 20,
        skip: GetFeedbacksDto.skip,
        order: GetFeedbacksDto.isAsc ? 'dateAsc' : 'dateDesc',
      };
      const subdomain = '/api/v1/feedbacks';
      const strUrl = this.sharedService.buildUrl(subdomain, params);
      const feedbacksData = await this.sharedService.makeHttpRequest(
        this.httpService.get(strUrl.toString(), {
          headers: { Authorization: secretKey },
        }),
      );

      const template = GetFeedbacksDto.templateId
        ? await this.getTemplateFile(GetFeedbacksDto.templateId)
        : null;

      const feedbacksWithSuggestedResponses = (
        feedbacksData.data.feedbacks as FeedbackInterface[]
      ).map((feedback) => {
        if (template) {
          const {
            imtId,
            productDetails,
            userName,
            text,
            id,
            createdDate,
            photoLinks,
          } = feedback;
          const brand = productDetails.brandName;
          const productName = productDetails.productName;
          const { suggestedResponses } = this.findResponsesInTemplateFile(
            imtId.toString(),
            brand,
            text,
            template,
            GetFeedbacksDto.isPersonalized,
            userName,
          );
          return {
            feedbackId: id,
            feedbackText: text,
            feedbackDate: createdDate,
            productDetails: {
              brand,
              productName,
              photoLink: photoLinks[0].miniSize,
            },
            suggestedResponses,
          };
        } else if (GetFeedbacksDto.aiModel) {
          console.log('AI model');
          // TODO: AI model
          return null;
        } else {
          return null;
        }
      });
      const token = this.sharedService.signToken({
        secretKey: GetFeedbacksDto.secretKey,
      });
      return { data: feedbacksWithSuggestedResponses, token };
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
      const secretKey = this.sharedService.decodeSecretKey(secretKeyEncrypted);
      if (!secretKey) {
        throw new HttpException(
          'No such marketplace or user or key was found',
          HttpStatus.FORBIDDEN,
        );
      }
      const body = {
        id: ReplyDto.feedbackId,
        text: ReplyDto.replyText,
      };
      const subdomain = '/api/v1/feedbacks';
      const strUrl = this.sharedService.buildUrl(subdomain, {});
      await this.sharedService.makeHttpRequest(
        this.httpService.patch(strUrl.toString(), body, {
          headers: { Authorization: secretKey },
        }),
      );
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
      const strUrlGet = this.sharedService.buildUrl(subdomain, params);
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
            ? this.personalizeResponse(response, userName)
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
        const strUrlPutch = this.sharedService.buildUrl(subdomain, {});
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

  private getChangeKeys(keys: KeyInterface[], marketplaceToLook: string) {
    const secretKey = keys.find((key) => key.uid === marketplaceToLook);
    return secretKey.change_key || null;
  }

  private personalizeResponse(text: string, userName: string): string {
    const capitalizedUserName = userName.toLowerCase().charAt(0).toUpperCase();
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
      return text;
    } else {
      return foundName + ', ' + text.charAt(0).toLowerCase() + text.slice(1);
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
        ? this.personalizeResponse(response, userName)
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
}
