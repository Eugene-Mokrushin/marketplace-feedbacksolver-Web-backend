import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, User, getAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { Firestore, getFirestore, doc, getDoc } from 'firebase/firestore';
import { UserInterface } from './firebaseDto';
import { FirebaseStorage, getStorage } from 'firebase/storage';

@Injectable()
export class FirebaseService {
  private readonly app: FirebaseApp;
  private readonly auth: Auth;
  private readonly RtDB: Database;
  private readonly Firestore: Firestore;
  private readonly storage: FirebaseStorage;
  private user: User;

  constructor(private config: ConfigService) {
    const firebaseConfig = {
      apiKey: this.config.get('FIREBASE_API_KEY'),
      authDomain: this.config.get('FIREBASE_AUTH_DOMAIN'),
      projectId: this.config.get('FIREBASE_PROJECT_ID'),
      storageBucket: this.config.get('FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: this.config.get('FIREBASE_MESSAGING_SENDER_ID'),
      appId: this.config.get('FIREBASE_APP_ID'),
    };
    if (!getApps().length) {
      this.app = initializeApp(firebaseConfig);
    } else {
      this.app = getApp();
    }
    const auth = getAuth(this.app);
    auth.languageCode = 'en';
    this.auth = auth;
    const RtDB = getDatabase(this.app);
    this.RtDB = RtDB;
    const firestore = getFirestore(this.app);
    this.Firestore = firestore;
    this.storage = getStorage(
      this.app,
      `gs://${this.config.get('FIREBASE_STORAGE_BUCKET')}`,
    );
  }

  getRtDB() {
    return this.RtDB;
  }

  getFirestore() {
    return this.Firestore;
  }

  getApp() {
    return this.app;
  }

  getAuth() {
    return this.auth;
  }

  setUser(user: User) {
    this.user = user;
  }

  getStorage() {
    return this.storage;
  }

  async checkAccessRights(
    organizationId: string,
    userToCheck: string,
    role: string,
  ) {
    const organizationRef = doc(
      this.getFirestore(),
      'organizations',
      organizationId,
    );
    const organizationDoc = await getDoc(organizationRef);
    if (!organizationDoc.exists()) {
      throw new HttpException(
        'No such organization was found',
        HttpStatus.NOT_FOUND,
      );
    }
    const users = organizationDoc.data().users as UserInterface[];
    const user = users.find(
      (user: UserInterface) => user.userId === userToCheck,
    );
    if (!user) {
      throw new HttpException(
        'No such user was found in this organization',
        HttpStatus.NOT_FOUND,
      );
    }
    if (user.role !== role) {
      throw new HttpException(
        'User does not have the required role',
        HttpStatus.FORBIDDEN,
      );
    }
    return user;
  }
}
