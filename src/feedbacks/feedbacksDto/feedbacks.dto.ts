import { IsBoolean, IsNotEmpty, IsInt, IsString } from 'class-validator';

export class GetFeedbacksDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  organizationId: string;

  @IsNotEmpty()
  marketplaceId: string;

  @IsBoolean()
  isAnswered: boolean;

  @IsInt()
  @IsNotEmpty()
  skip: number;

  @IsInt()
  @IsNotEmpty()
  take: number;

  @IsBoolean()
  isAsc?: boolean;
  secretKey?: string;
  templateId?: string;
  aiModel?: 'gpt-3.5' | 'gpt-4';
  isPersonalized?: boolean;
  numberOfSuggestions?: number;
}

export class ReplyDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  @IsString()
  replyText: string;

  @IsNotEmpty()
  feedbackId: string;
}

export interface KeyInterface {
  change_key: string | null;
  stats_key: string | null;
  uid: string;
}

export class MassReplyDto {
  @IsNotEmpty()
  take: number;

  @IsNotEmpty()
  @IsBoolean()
  withComment: boolean;

  @IsNotEmpty()
  minEvaluation: number;

  isAsc: boolean;
  aiModel: 'gpt-3.5' | 'gpt-4';
  templateId: string | null;

  @IsNotEmpty()
  @IsBoolean()
  isPersonalized: boolean;
}

export interface FilteredFiveFeedback {
  feedbackId: string;
  brand: string;
  user: string;
  feedback: string;
  response: string;
  firstPhotoLink: string | null;
  createdDate: string;
}

export class WBmanyDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  organizationId: string;

  @IsNotEmpty()
  marketplaceId: string;

  @IsNotEmpty()
  selectedTemplateId: string;

  @IsBoolean()
  personalizedResponse: boolean;

  secretKey?: string;
}

export interface FeedbackInterface {
  id: string;
  imtId: number;
  nmId: number;
  subjectId: number;
  userName: string;
  text: string;
  productValuation: number;
  createdDate: string;
  updatedDate: string;
  answer: string | null;
  state: string;
  productDetails: {
    imtId: number;
    nmId: number;
    productName: string;
    supplierArticle: string;
    supplierName: string;
    brandName: string;
    size: string;
  };
  photoLinks: {
    fullSize: string;
    miniSize: string;
  }[];
  video: string | null;
  wasViewed: boolean;
  isCreationSupplierComplaint: boolean;
  supplierComplaint: string | null;
}

export interface Template {
  brand: string;
  response: string;
  articleWB: string;
  triggers: string[] | null;
  recommendation: string[] | null;
  blacklistResponse: string[] | null;
}

export class GetQandFNumbersDto {
  @IsNotEmpty()
  organizationId: string;

  @IsNotEmpty()
  marketplaceId: string;

  @IsNotEmpty()
  type: 'ozon' | 'wildberries' | 'yandex';
}
