import { IsNotEmpty } from 'class-validator';

export class NewMarketplaceDto {
  @IsNotEmpty()
  organizationId: string;

  @IsNotEmpty()
  shop_name: string;

  change_key: string | null;

  stats_key: string | null;

  @IsNotEmpty()
  marketplace: 'Wilberries' | 'Ozon' | 'Yandex';
}
