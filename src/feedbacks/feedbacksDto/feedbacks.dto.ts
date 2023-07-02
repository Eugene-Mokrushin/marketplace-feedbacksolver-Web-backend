import { IsNotEmpty } from 'class-validator';

export class GetFeedbacksDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  organizationId: string;

  @IsNotEmpty()
  marketplaceId: string;
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
