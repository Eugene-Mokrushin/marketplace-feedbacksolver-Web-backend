import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Credentials, CredentialsSignup, TokenUid } from './authDto';
import { LoggerService } from '@/log/logger.service';
import { FirebaseService } from '@/firebase/firebase.service';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { instanceToPlain } from 'class-transformer';
import { FirebaseAdminService } from '@/firebase/firebase.admin.service';
import { doc, setDoc } from 'firebase/firestore';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private logger: LoggerService,
    private firebaseService: FirebaseService,
    private firebaseAdminService: FirebaseAdminService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}
  auth = this.firebaseService.getAuth();

  async signUp(credentials: CredentialsSignup) {
    try {
      const user = await createUserWithEmailAndPassword(
        this.auth,
        credentials.email,
        credentials.password,
      )
        .then(async (userCredential) => {
          const user = userCredential.user;
          this.firebaseService.setUser(user);
          this.setupBasicUserProfile(user, credentials.organizationName);
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
      return { data: user };
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
          throw new UnauthorizedException(errorMessage);
        });
      return { data: response };
    } catch (error) {
      throw new HttpException(error.response, error.status);
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
      this.logger.error(`Error signing in with Google: ${error}`);
      throw new Error('An error occurred while signing in with Google');
    }
  }

  private async setupBasicUserProfile(user: User, organizationName: string) {
    try {
      const usersRef = doc(
        this.firebaseService.getFirestore(),
        'users',
        user.uid,
      );
      await setDoc(
        usersRef,
        {
          email: user.email,
          emailVerified: null,
          image: null,
          name: organizationName,
        },
        { merge: true },
      );
    } catch (error) {
      this.logger.error(`Error setting up User Profile: ${error}`);
      throw new HttpException(error.response, error.status);
    }
  }

  async signToken(payload: object): Promise<{ access_token: string }> {
    const secret = this.config.get('JWT_SECRET');
    const token = await this.jwt.signAsync(payload, {
      expiresIn: '15m',
      secret: secret,
    });
    return {
      access_token: token,
    };
  }
}
