import { User } from '@firebase/auth';
import { IsNotEmpty } from 'class-validator';

export class NewFileDto {
  @IsNotEmpty()
  fileName: string;

  @IsNotEmpty()
  organizationUid: string;

  @IsNotEmpty()
  user: User;
}

export class RawData {
  articleWB: string | null;
  brand: string | null;
  rating: number | null;
  response: string[] | null;
  triggers: string[] | null;
  blacklistResponse: string | null;
  recommendation: string[] | null;
}
