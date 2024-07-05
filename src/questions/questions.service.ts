import { FirebaseService } from '@/firebase/firebase.service';
import { LoggerService } from '@/log/logger.service';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SampleDto } from './questionsDto';
import { doc, getDoc } from 'firebase/firestore';
import { HttpService } from '@nestjs/axios';
import { WebsocketGateway } from '@/websocket/websocket.gateway';
import { SharedService } from '@/shared/shared.service';
import { OpenAIService } from '@/openai/openai.service';

@Injectable()
export class QuestionsService {
  constructor(
    private websocketGateway: WebsocketGateway,
    private logger: LoggerService,
    private firebaseService: FirebaseService,
    private httpService: HttpService,
    private sharedService: SharedService,
    private openaiService: OpenAIService,
  ) {}

  async getSampleWildberries(dto: SampleDto) {
    console.log('Sample!');
    try {
      const organizationRef = doc(
        this.firebaseService.getFirestore(),
        'marketplaces',
        dto.marketplaceId,
      );
      const organizationDoc = await getDoc(organizationRef);
      let secretKeyMain = null;
      if (organizationDoc.exists()) {
        const organizationData = organizationDoc.data();
        if (organizationData.organizationId !== dto.organizationId) {
          throw new HttpException(
            'No such organization or user was found',
            HttpStatus.NOT_FOUND,
          );
        }
        secretKeyMain = this.sharedService.decodeSecretKey(
          organizationData.mainKey,
        );
      }
      if (!secretKeyMain) {
        this.logger.error('No such marketplace or user or key was found');
        throw new HttpException(
          "You don't have permissions",
          HttpStatus.FORBIDDEN,
        );
      }
      const subdomainQuestions = '/api/v1/questions';
      const productLink = '/content/v1/cards/filter';
      const paramsQuestions = {
        isAnswered: false,
        take: dto.take,
        skip: 0,
        order: 'dateAsc',
      };
      const questionsUrl = this.sharedService.buildUrl(
        'WILDBERRIES_FEEDBACKS_API',
        subdomainQuestions,
        paramsQuestions,
      );
      const response = await this.sharedService.makeHttpRequest(
        this.httpService.get(questionsUrl.toString(), {
          headers: { Authorization: secretKeyMain },
        }),
      );
      // item.productDetails.supplierArticle,
      const productsNoPhotos = response.data.questions.map((item) => {
        return {
          id: item.productDetails.nmId,
          title: item.productDetails.productName,
          question: item.text,
          img: '',
        };
      });
      const productsPhotosPromised = response.data.questions.map((item) => {
        const productsUrl = this.sharedService.buildUrl(
          'WILDBERRIES_CONTENT_API',
          productLink,
          {},
        );
        const img = new Promise((resolve, reject) => {
          this.sharedService
            .makeHttpRequest(
              this.httpService.post(
                productsUrl.toString(),
                JSON.stringify({
                  allowedCategoriesOnly: false,
                  vendorCodes: [item.productDetails.supplierArticle],
                }),
                {
                  headers: {
                    Authorization: secretKeyMain,
                    'Content-Type': 'application/json',
                  },
                },
              ),
            )
            .then((res) => {
              resolve(res.data[0].mediaFiles[0]);
            })
            .catch((err) => {
              reject(err);
            });
        });
        return img;
      });
      const productsPhotos = await Promise.all(productsPhotosPromised);
      const products = productsNoPhotos.map((item, index) => {
        return {
          ...item,
          img: productsPhotos[index],
        };
      });

      return products;
    } catch (error) {
      this.logger.error(error);
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
