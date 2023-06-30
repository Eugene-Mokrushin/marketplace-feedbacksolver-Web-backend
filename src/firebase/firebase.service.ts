import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, User, getAuth } from 'firebase/auth';
import { Database, getDatabase } from 'firebase/database';
import { Firestore, getFirestore } from 'firebase/firestore';

@Injectable()
export class FirebaseService {
  private readonly app: FirebaseApp;
  private readonly auth: Auth;
  private readonly RtDB: Database;
  private readonly Firestore: Firestore;
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
}
