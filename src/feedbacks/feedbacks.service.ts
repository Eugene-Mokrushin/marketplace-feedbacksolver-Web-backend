import { FirebaseService } from '@/firebase/firebase.service';
import { LoggerService } from '@/log/logger.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import {
  GetFeedbacksDto,
  KeyInterface,
  UserInterface,
  ReplyDto,
  FilteredFiveFeedback,
} from './feedbacksDto';
import { doc, getDoc } from 'firebase/firestore';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable, catchError, lastValueFrom, map } from 'rxjs';
import { AxiosResponse } from 'axios';
import { promisify } from 'util';
import { createCipheriv, createDecipheriv, createHash, scrypt } from 'crypto';

@Injectable()
export class FeedbacksService {
  constructor(
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
    const key =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3NJRCI6ImJjYTRmNjAzLTIwMTEtNGM1ZC1iNjNjLTI1Mzg5MzNlN2ZmNyJ9.v44cO5pVsRwEdUSEvb23iox2jb4XMTfSm-cSe5o_IEU';
    const encrypted = await this.encodeSecretKey(key);
    const decrypted = await this.decodeSecretKey(encrypted);
    console.log(encrypted);
    console.log(decrypted);
    console.log(decrypted === key);
    return true;
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

  private async encodeSecretKey(message: string) {
    const iv = createHash('sha256')
      .update(this.config.get('SUPER_SECRET_IV_KEY'))
      .digest()
      .subarray(0, 16);
    const key = (await promisify(scrypt)(
      this.config.get('SUPER_SECRET_ENCRYPTION_KEY'),
      'salt',
      32,
    )) as Buffer;
    const cipher = createCipheriv('aes-256-ctr', key, iv);
    const encryptedText = Buffer.concat([
      cipher.update(message),
      cipher.final(),
    ]);
    return encryptedText.toString('base64');
  }

  private async decodeSecretKey(cipheredMessage: string) {
    const decryptedBuffer = Buffer.from(cipheredMessage, 'base64');
    const iv = createHash('sha256')
      .update(this.config.get('SUPER_SECRET_IV_KEY'))
      .digest()
      .subarray(0, 16);
    const key = (await promisify(scrypt)(
      this.config.get('SUPER_SECRET_ENCRYPTION_KEY'),
      'salt',
      32,
    )) as Buffer;
    const decipher = createDecipheriv('aes-256-ctr', key, iv);
    const decryptedText = Buffer.concat([
      decipher.update(decryptedBuffer),
      decipher.final(),
    ]);
    return decryptedText.toString('base64');
  }
}
