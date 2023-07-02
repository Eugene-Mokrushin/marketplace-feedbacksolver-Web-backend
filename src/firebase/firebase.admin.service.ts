import admin = require('firebase-admin');
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';
import { Firestore, getFirestore } from 'firebase-admin/firestore';

@Injectable()
export class FirebaseAdminService {
  private readonly adminApp: App;
  private readonly adminAuth: Auth;
  private readonly adminFirestore: Firestore;

  constructor(private config: ConfigService) {
    const app = initializeApp({
      serviceAccountId:
        'firebase-adminsdk-tsy88@feedback-solver.iam.gserviceaccount.com',
      credential: admin.credential.cert(
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require(this.config.get('FIREBASE_ADMIN_CREDENTIALS_PATH')),
      ),
    });
    const auth = getAuth(app);
    const adminFirestore = getFirestore(app);
    this.adminAuth = auth;
    this.adminApp = app;
    this.adminFirestore = adminFirestore;
  }

  getAdminApp() {
    return this.adminApp;
  }

  getAdminAuth() {
    return this.adminAuth;
  }

  getAdminFirestore() {
    return this.adminFirestore;
  }
}
