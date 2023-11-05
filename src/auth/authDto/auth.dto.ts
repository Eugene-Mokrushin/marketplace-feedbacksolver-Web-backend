import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from '@decorators/is-strong-password.decorator';
import { Match } from '@/decorators/match.decorator';

export class Credentials {
  @IsNotEmpty({ message: 'Укажите настояший email' })
  @IsEmail({}, { message: 'Укажите настояший email' })
  email: string;

  @IsNotEmpty({ message: 'Укажите пароль' })
  @IsStrongPassword()
  password: string;
}

export class CredentialsSignup extends Credentials {
  @IsNotEmpty({ message: 'Повторите пароль' })
  @Match('password')
  password_repeat: string;

  @IsString()
  @IsNotEmpty({ message: 'Укажите имя' })
  organizationName: string;
}

export class TokenUid {
  @IsNotEmpty()
  idToken: string;
}

export class NewTokenDto {
  @IsNotEmpty()
  shopId: string;
}
