import { IsEmail, IsNotEmpty } from 'class-validator';

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

export class AddUserDto {
  @IsEmail()
  userToAdd: string;

  @IsNotEmpty()
  userSetter: string;

  @IsNotEmpty()
  organizationId: string;

  @IsNotEmpty()
  role: string;
}

export class NewKeyPairDto {
  @IsNotEmpty()
  userId: string;

  @IsNotEmpty()
  organizationId: string;

  change_key: string | null;

  stats_key: string | null;

  @IsNotEmpty()
  marketplaceId: string;
}
