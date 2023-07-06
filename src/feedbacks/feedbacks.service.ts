import { FirebaseService } from '@/firebase/firebase.service';
import { LoggerService } from '@/log/logger.service';
import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  GetFeedbacksDto,
  KeyInterface,
  UserInterface,
  ReplyDto,
  FilteredFiveFeedback,
  WBmanyDto,
  FeedbackInterface,
  Template,
} from './feedbacksDto';
import { doc, getDoc } from 'firebase/firestore';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable, catchError, lastValueFrom, map } from 'rxjs';
import { AxiosResponse } from 'axios';
import * as crypto from 'crypto';
import { Socket } from 'socket.io';
import { WebsocketGateway } from '@/websocket/websocket.gateway';

@Injectable()
export class FeedbacksService {
  constructor(
    private websocketGateway: WebsocketGateway,
    private logger: LoggerService,
    private firebaseService: FirebaseService,
    private httpService: HttpService,
    private config: ConfigService,
  ) {}

  async getWildberriesFeedbacks(GetFeedbacksDto: GetFeedbacksDto) {
    const organizationRef = doc(
      this.firebaseService.getFirestore(),
      'organizations',
      GetFeedbacksDto.organizationId,
    );
    const organizationDoc = await getDoc(organizationRef);
    if (organizationDoc.exists()) {
      const organizationData = organizationDoc.data();
      this.checkAccessRights(organizationData.users, GetFeedbacksDto.userId);
      const key = this.getChangeKeys(
        organizationData.secret_keys,
        GetFeedbacksDto.marketplaceId,
      );
      const params = {
        isAnswered: false,
        take: 500,
        skip: 0,
        order: 'dateAsc',
      };
      const data = [
        {
          brand: 'Richard',
          message:
            'Добрый день. Благодарим за выбор нашей продукции. Мы подготовили для вас подборку товара бренда Richard: 7336798,30577175,35397927. Приятного Вам чаепития!',
        },
        {
          brand: 'Curtis',
          message:
            'Добрый день. Благодарим за выбор нашей продукции. Мы подготовили для вас подборку товара бренда Curtis: 19539790,127084571,40402649. Приятного Вам чаепития!',
        },
        {
          brand: 'Лисма',
          message:
            'Добрый день. Благодарим за выбор нашей продукции. Мы подготовили для вас подборку товара бренда Лисма: 23683230, 35515191. Приятного Вам чаепития!',
        },
        {
          brand: 'Coffesso',
          message:
            'Добрый день. Благодарим за выбор нашей продукции. Мы подготовили для вас подборку товара бренда Coffesso: 11614544,35300046,67836206.',
        },
        {
          brand: 'Майский',
          message:
            'Добрый день. Благодарим за выбор нашей продукции. Мы подготовили для вас подборку товара бренда Майский: 15325073, 15280285, 13075108. Приятного Вам чаепития!',
        },
      ];
      const subdomain = '/api/v1/feedbacks';
      const strUrl = this.buildUrl(subdomain, params);
      const feedbacksData = await lastValueFrom(
        await this.makeHttpRequest(
          this.httpService.get(strUrl.toString(), {
            headers: { Authorization: key },
          }),
        ),
      );
      const newArray: FilteredFiveFeedback[] = feedbacksData.data.feedbacks
        .filter((item) => item.productValuation === 5)
        .map((item) => {
          const { productDetails, userName, text, id, createdDate } = item;
          const brandName = productDetails.brandName;
          const response =
            data.find((brandData) => brandData.brand === brandName)?.message ||
            '';

          return {
            feedbackId: id,
            brand: brandName,
            user: userName,
            feedback: text,
            response: response,
            createdDate,
          };
        });

      for (const element of newArray) {
        const body = {
          id: element.feedbackId,
          text: element.response,
        };
        const res = await lastValueFrom(
          await this.makeHttpRequest(
            this.httpService.patch(strUrl.toString(), body, {
              headers: { Authorization: key },
            }),
          ),
        );
        console.log(res);
      }
      return newArray;
    } else {
      throw new HttpException(
        'No such organization or user was found',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  async replyWildberriesFeedbackSingle(ReplyDto: ReplyDto) {
    console.log(ReplyDto);
    const key = ReplyDto.markeplaceId;
    const encrypted = this.encodeSecretKey(key);
    const decrypted = this.decodeSecretKey(encrypted);
    console.log(encrypted);
    console.log(decrypted);
    return true;
  }

  async replyWildberriesFeedbackMultiple(WBmanyDto: WBmanyDto) {
    try {
      // Get the client socket to send updates
      const clientId = WBmanyDto.clientId;
      if (!clientId) {
        throw new HttpException('No client', HttpStatus.BAD_REQUEST);
      }

      // Get the secret key if it's not provided
      let secretKey = WBmanyDto.secretKey;
      if (!secretKey) {
        const organizationRef = doc(
          this.firebaseService.getFirestore(),
          'organizations',
          WBmanyDto.organizationId,
        );
        const organizationDoc = await getDoc(organizationRef);
        if (organizationDoc.exists()) {
          const organizationData = organizationDoc.data();
          this.checkAccessRights(organizationData.users, WBmanyDto.clientId);
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
      } else {
        secretKey = this.decodeSecretKey(secretKey);
      }
      const params = {
        isAnswered: false,
        take: 500,
        skip: 0,
        order: 'dateAsc',
      };
      const subdomain = '/api/v1/feedbacks';
      const strUrl = this.buildUrl(subdomain, params);
      const feedbacksData = await lastValueFrom(
        await this.makeHttpRequest(
          this.httpService.get(strUrl.toString(), {
            headers: { Authorization: secretKey },
          }),
        ),
      );

      const loadedTemplateMock: Template[] = [
        {
          brand: 'Richard',
          message: 'test',
          article: '123123412',
          triggerWords: ['test'],
          suggestions: ['test'],
        },
      ];
      const newArray: FilteredFiveFeedback[] = (
        feedbacksData.data.feedbacks as FeedbackInterface[]
      )
        .filter((item) => item.productValuation === 5)
        .map((item) => {
          const { productDetails, userName, text, id, createdDate, imtId } =
            item;
          const brandName = productDetails.brandName;
          let selectedTemplate: null | Template | Template[] = null;
          // Find the item in the loadedTemplateMock either by article first or if not found by brand
          selectedTemplate = loadedTemplateMock.find((item) => {
            if (item.article === imtId.toString()) {
              return item;
            }
          });
          if (!selectedTemplate) {
            loadedTemplateMock.forEach((item) => {
              if (item.brand === brandName) {
                selectedTemplate.push(item);
                return item;
              }
            });
          }

          // If no template is found, skip the item
          if (!selectedTemplate) {
            return null;
          }

          if (Array.isArray(selectedTemplate)) {
            const randomIndex = Math.floor(
              Math.random() * selectedTemplate.length,
            );
            selectedTemplate = selectedTemplate[randomIndex] as Template;
          }

          // If there is suggeeestions expected, insert random suggestions
          const suggestionsPattern = /r\{(\d+)\}/;
          const response = suggestionsPattern.test(selectedTemplate.message)
            ? selectedTemplate.message.replace(/r\{(\d+)\}/, (_, number) => {
                const numSuggestions = Math.min(
                  Number(number),
                  (selectedTemplate as Template).message.length,
                );
                const selectedSuggestions = (
                  selectedTemplate as Template
                ).message.slice(0, numSuggestions);
                return selectedSuggestions.join(', ');
              })
            : selectedTemplate.message;

          return {
            feedbackId: id,
            brand: brandName,
            user: userName,
            feedback: text,
            response: response,
            createdDate,
          };
        });

      for (const element of newArray) {
        const body = {
          id: element.feedbackId,
          text: element.response,
        };
        const res = await lastValueFrom(
          await this.makeHttpRequest(
            this.httpService.patch(strUrl.toString(), body, {
              headers: { Authorization: key },
            }),
          ),
        );
        console.log(res);
      }

      // Initiate the WS connection
      // Perform your time-demanding function and send updates to the user
      // ...
      // Use `client.emit('event', data)` to send updates to the specific user
      const clientSocket = this.websocketGateway.getClientSocket(client);
      // Close the WS connection when the function is done
      for (let index = 0; index < 10; index++) {
        setTimeout(() => {
          this.websocketGateway.updateProgress(clientSocket, index);
        }, 1000 * index);
      }
      setTimeout(() => {
        clientSocket.disconnect();
      }, 11000);
    } catch (error) {
      throw new HttpException('Error', HttpStatus.BAD_REQUEST);
    }
  }

  private checkAccessRights(users: UserInterface[], userToCheck: string) {
    const usersArray = users || [];
    const userSetter: UserInterface = usersArray.find((user) => {
      if (user.userId === userToCheck) {
        return user;
      } else {
        return null;
      }
    });
    if (userSetter && userSetter.role !== 'admin') {
      throw new HttpException(
        "You don't have permissions",
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  private getChangeKeys(keys: KeyInterface[], marketplaceToLook: string) {
    const secretKey = keys.find((key) => key.uid === marketplaceToLook);
    return secretKey.change_key || null;
  }

  private buildUrl(
    subdomain: string,
    queryParams: { [key: string]: any },
  ): URL {
    const url = new URL(
      this.config.get('WILDBERRIES_FEEDBACKS_API') + subdomain,
    );
    Object.keys(queryParams).forEach((key) => {
      url.searchParams.append(key, queryParams[key]);
    });
    return url;
  }

  private async makeHttpRequest(
    http$: Observable<AxiosResponse<any>>,
  ): Promise<Observable<any>> {
    return http$.pipe(
      map((response: AxiosResponse) => {
        return response.data;
      }),
      catchError((error) => {
        const errorMessage = `Server connection Error`;
        const status = error.response?.status || HttpStatus.UNAUTHORIZED;
        this.logger.error(`Couldn't fetch `);
        throw new HttpException(errorMessage, status);
      }),
    );
  }

  encodeSecretKey(text: string): string {
    const secretIVKey = this.config.get('SUPER_SECRET_IV_KEY');
    const secretKey = this.config.get('SUPER_SECRET_ENCRYPTION_KEY');
    const secretAlgorithm = this.config.get(
      'SUPER_SECRET_ENCRYPTION_ALOGORITHM',
    );
    const iv = Buffer.from(secretIVKey as string, 'hex');
    console.log(iv);
    const key = Buffer.from(secretKey as string, 'hex');
    const cipher = crypto.createCipheriv(secretAlgorithm, key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return encrypted;
  }

  decodeSecretKey(encryptedText: string): string {
    const secretIVKey = this.config.get('SUPER_SECRET_IV_KEY');
    const secretKey = this.config.get('SUPER_SECRET_ENCRYPTION_KEY');
    const secretAlgorithm = this.config.get(
      'SUPER_SECRET_ENCRYPTION_ALOGORITHM',
    );
    const iv = Buffer.from(secretIVKey as string, 'hex');
    const key = Buffer.from(secretKey as string, 'hex');
    const decipher = crypto.createDecipheriv(secretAlgorithm, key, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  handleTriggerWords(text: string, triggerWords: string[]): boolean {
    // Check if the text contains any of the trigger words, but cansel the check if the text contains the word "не " or "нет " with a space after it (to avoid false positives). e.g. "не понравился" or "нет, не понравился" if the trigger word is "нрав" should return false
    // For example:
    // const text = 'Чай понравился, очень вкусный но весь не помятый'
    // const triggers = ['мятый', 'помятый', 'грязный', 'мят']
    // this returns true, eventough it shoudl return false because помятый is a trigger word, and there is не before that word.

    // const text = 'Чай понравился, очень вкусный но весь перемятый'
    // const triggers = ['мят']

    // should return true becuse there is мят in перемятый and there is no не or нет before перемятый

    const triggerWordsPattern = new RegExp(
      `(?<!не |нет )(${triggerWords.join('|')})`,
      'gi',
    );
    return triggerWordsPattern.test(text);
  }

  handleSuggestion(text: string, suggestions: string[]): string {
    const suggestionsPattern = /r\{(\d+)\}/;
    const suggestionsArray = suggestions;
    return suggestionsPattern.test(text)
      ? text.replaceAll(suggestionsPattern, (_, number) => {
          const numSuggestions = Math.min(
            Number(number),
            suggestionsArray.length,
          );
          if (numSuggestions === 0 || suggestionsArray.length === 0) {
            return text.replace(suggestionsPattern, '');
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
}
