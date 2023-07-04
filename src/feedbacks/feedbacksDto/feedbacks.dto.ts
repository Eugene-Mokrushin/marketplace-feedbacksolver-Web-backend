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
