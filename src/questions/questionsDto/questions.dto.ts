import { IsNotEmpty } from 'class-validator';

export class SampleDto {
  @IsNotEmpty()
  type: 'wildberries' | 'ozon' | 'yandex';
  @IsNotEmpty()
  organizationId: string;
  @IsNotEmpty()
  marketplaceId: string;

  @IsNotEmpty()
  take: number;
}
