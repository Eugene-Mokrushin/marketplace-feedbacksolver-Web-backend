import { IsNotEmpty } from 'class-validator';

export class GetFeedbacksDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  organizationId: string;

  @IsNotEmpty()
  marketplaceId: string;
}

export class ReplyDto {
  markeplaceId: string;
}

export interface UserInterface {
  userId: string;
  role: string;
}

export interface KeyInterface {
  change_key: string | null;
  stats_key: string | null;
  uid: string;
}

export interface FilteredFiveFeedback {
  feedbackId: string;
  brand: string;
  user: string;
  feedback: string;
  response: string;
}

export class WBmanyDto {
  @IsNotEmpty()
  clientId: string;

  @IsNotEmpty()
  organizationId: string;

  @IsNotEmpty()
  marketplaceId: string;

  @IsNotEmpty()
  selectedTemplateId: string;

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
  message: string;
  article: string;
  triggerWords: string[] | null;
  suggestions: string[] | null;
}
