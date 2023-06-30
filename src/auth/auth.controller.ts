import { Body, Controller, Post } from '@nestjs/common';
import { Credentials, CredentialsSignup, TokenUid } from './authDto';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('/signup')
  signup(@Body() dto: CredentialsSignup) {
    return this.authService.signUp(dto);
  }

  @Post('/signin')
  signin(@Body() dto: Credentials) {
    return this.authService.signIn(dto);
  }

  @Post('/googleSignin')
  googleSignin(@Body() dto: TokenUid) {
    return this.authService.signWithGoogle(dto);
  }
}
