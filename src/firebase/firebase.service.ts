import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, User, getAuth } from 'firebase/auth';

@Injectable()
export class FirebaseService {
  private readonly app: FirebaseApp;
  private readonly auth: Auth;
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
