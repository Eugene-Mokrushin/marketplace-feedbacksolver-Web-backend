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
