import admin = require('firebase-admin');
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { App, initializeApp } from 'firebase-admin/app';
import { Auth, getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseAdminService {
  private readonly adminApp: App;
  private readonly adminAuth: Auth;

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
    this.adminAuth = auth;
    this.adminApp = app;
  }

  getAdminApp() {
    return this.adminApp;
  }

  getAdminAuth() {
    return this.adminAuth;
  }
}
