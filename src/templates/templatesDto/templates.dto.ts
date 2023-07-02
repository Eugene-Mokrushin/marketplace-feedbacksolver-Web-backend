import { IsNotEmpty } from 'class-validator';

export class NewFileDto {
  @IsNotEmpty()
  fileName: string;

  @IsNotEmpty()
  organizationUid: string;

  @IsNotEmpty()
  userId: string;
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

export interface TemplateType {
  file_name: string;
  timestamp: Date;
  raw_data?: string;
}
