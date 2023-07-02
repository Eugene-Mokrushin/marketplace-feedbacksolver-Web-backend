import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
import { Timestamp, doc, setDoc } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private logger: LoggerService,
    private firebaseService: FirebaseService,
    private firebaseAdminService: FirebaseAdminService,
  ) {}
  auth = this.firebaseService.getAuth();

  async signUp(credentials: CredentialsSignup) {
    try {
      const user = await createUserWithEmailAndPassword(
        this.auth,
        credentials.email,
        credentials.password,
      )
        .then((userCredential) => {
          const user = userCredential.user;
          this.firebaseService.setUser(user);
          this.setupBasicUserProfile(user);
          this.createNewOrganization(user);
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
      this.logger.error(`Error signing in with Google: ${error}`);
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
      this.logger.error(`Error signing in with Google: ${error}`);
      throw new Error('An error occurred while signing in with Google');
    }
  }

  private async createNewOrganization(user: User) {
    try {
      const newOrganizationId = uuidv4();
      const organizationRef = doc(
        this.firebaseService.getFirestore(),
        'organizations',
        newOrganizationId,
      );
      const userRef = doc(
        this.firebaseService.getFirestore(),
        'users',
        user.uid,
      );
      await setDoc(
        organizationRef,
        {
          users: [userRef],
          plan: 'Basic',
          organization_name: `Организация ${user.email.split('@')[0]}`,
        },
        { merge: true },
      );
    } catch (error) {
      this.logger.error(`Error creating new organization: ${error}`);
      throw new HttpException(error.response, error.status);
    }
  }

  private async setupBasicUserProfile(user: User) {
    try {
      const usersRef = doc(
        this.firebaseService.getFirestore(),
        'users',
        user.uid,
      );
      await setDoc(
        usersRef,
        {
          users_name: user.email.split('@')[0],
          registred_at: Timestamp.fromDate(new Date()),
        },
        { merge: true },
      );
    } catch (error) {
      this.logger.error(`Error setting up User Profile: ${error}`);
      throw new HttpException(error.response, error.status);
    }
  }
}
