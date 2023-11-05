import { IsEmail, IsNotEmpty } from 'class-validator';

export class NewMarketplaceDto {
  @IsNotEmpty()
  organizationId: string;

  @IsNotEmpty()
  name: string;

  mainKey: string | null;

  analyticsKey: string | null;

  default: boolean | null;

  @IsNotEmpty()
  type: 'wilberries' | 'ozon' | 'yandex';
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
  organizationId: string;

  mainKey: string | null;

  analyticsKey: string | null;

  default: boolean | null;

  @IsNotEmpty()
  id: string;
}

export class OrganizationIdDto {
  @IsNotEmpty()
  organizationId: string;
}

export class UpdateProfilePictureDto {
  @IsNotEmpty()
  uid: string;

  @IsNotEmpty()
  previousImage: string;
}
