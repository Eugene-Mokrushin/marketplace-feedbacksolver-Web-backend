import { FirebaseService } from '@/firebase/firebase.service';
import { LoggerService } from '@/log/logger.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { GetFeedbacksDto, KeyInterface, UserInterface } from './feedbacksDto';
import { doc, getDoc } from 'firebase/firestore';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Observable, catchError, map } from 'rxjs';
import { AxiosResponse } from 'axios';

@Injectable()
export class FeedbacksService {
  constructor(
    private logger: LoggerService,
    private firebaseService: FirebaseService,
    private httpService: HttpService,
    private config: ConfigService,
  ) {}

  async getWildberriesFeedbacks(GetFeedbacksDto: GetFeedbacksDto) {
    // const organizationRef = doc(
    //   this.firebaseService.getFirestore(),
    //   'organizations',
    //   GetFeedbacksDto.organizationId,
    // );
    // const organizationDoc = await getDoc(organizationRef);
    // if (organizationDoc.exists()) {
    // const organizationData = organizationDoc.data();
    // this.checkAccessRights(organizationData.users, GetFeedbacksDto.userId);
    // const key = this.getChangeKeys(
    //   organizationData.secret_keys,
    //   GetFeedbacksDto.marketplaceId,
    // );
    const key =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2Nlc3NJRCI6ImJjYTRmNjAzLTIwMTEtNGM1ZC1iNjNjLTI1Mzg5MzNlN2ZmNyJ9.v44cO5pVsRwEdUSEvb23iox2jb4XMTfSm-cSe5o_IEU';
    const params = {
      isAnswered: false,
      take: 20,
      skip: 0,
    };
    const subdomain = '';
    const strUrl = this.buildUrl(subdomain, params);
    return lastValueFrom(
      await this.makeHttpRequest(
        this.httpService.get(strUrl.toString()),
        postpone,
        retries,
      ),
    );

    const headers = {
      Authorization: key,
    };
    console.log(params);
    const response = await this.wildberries.getWildberries(
      '/api/v1/feedbacks',
      params,
      headers,
    );
    console.log(response);
    return { data: response };
    // } else {
    //   throw new HttpException(
    //     'No such organization or user was found',
    //     HttpStatus.NOT_FOUND,
    //   );
    // }
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
}
