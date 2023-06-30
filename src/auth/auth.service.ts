import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Credentials, CredentialsSignup, TokenUid } from './authDto';
import { LoggerService } from '@/logger/logger.service';
import { FirebaseService } from '@/firebase/firebase.service';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { instanceToPlain } from 'class-transformer';
import { FirebaseAdminService } from '@/firebase/firebase.admin.service';

@Injectable()
export class AuthService {
  constructor(
    private config: ConfigService,
    private logger: LoggerService,
    private firebaseService: FirebaseService,
    private firebaseAdminService: FirebaseAdminService,
  ) {}
  auth = this.firebaseService.getAuth();

  async signUp(credentials: CredentialsSignup) {
    try {
      await createUserWithEmailAndPassword(
        this.auth,
        credentials.email,
        credentials.password,
      )
        .then((userCredential) => {
          const user = userCredential.user;
          this.firebaseService.setUser(user);
          this.logger.log(`Signed up ${user.uid}`);
          return user;
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          this.logger.error(
            `Failed to sign up ${errorCode}. Message: ${errorMessage}`,
          );
          throw new HttpException(
            errorMessage.replace('Firebase: ', ''),
            HttpStatus.FORBIDDEN,
          );
        });
    } catch (error) {
      throw new HttpException(error.response, error.status);
    }
  }

  async signIn(credentials: Credentials) {
    try {
      const response = await signInWithEmailAndPassword(
        this.auth,
        credentials.email,
        credentials.password,
      )
        .then((userCredential) => {
          const user = userCredential.user;
          this.firebaseService.setUser(user);
          this.logger.log(`Signed in ${user.uid}`);
          return user;
        })
        .catch((error) => {
          const errorCode = error.code;
          const errorMessage = error.message;
          this.logger.error(
            `Failed to sign in ${errorCode}. Message: ${errorMessage}`,
          );
          throw new HttpException(
            errorMessage.replace('Firebase: ', ''),
            HttpStatus.UNAUTHORIZED,
          );
        });
      return { data: response };
    } catch (error) {
      throw new HttpException(error.response, error.status);
    }
  }

  // TODO: Fix signing up/in with Googl
  async signWithGoogle(idTokenDto: TokenUid) {
    try {
      const idTokenPlain = instanceToPlain(idTokenDto);
      const adminApp = this.firebaseAdminService
        .getAdminAuth()
        .verifyIdToken(idTokenPlain.idToken);
      console.log(adminApp);
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw new Error('An error occurred while signing in with Google');
    }
  }

  private async checkIfUserExists(googleUserId: string): Promise<boolean> {
    try {
      const user = await this.firebaseAdminService
        .getAdminAuth()
        .getUser(googleUserId);
      if (user) return true;
      else return false;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw new Error('An error occurred while signing in with Google');
    }
  }
}
