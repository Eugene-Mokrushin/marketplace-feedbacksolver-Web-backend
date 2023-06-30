import { Global, Module } from '@nestjs/common';
import { FirebaseService } from './firebase.service';
import { FirebaseAdminService } from './firebase.admin.service';

@Global()
@Module({
  providers: [FirebaseService, FirebaseAdminService],
  exports: [FirebaseService, FirebaseAdminService],
})
export class FirebaseModule {
  static forRoot(): any {
    return {
      module: FirebaseModule,
      providers: [FirebaseService, FirebaseAdminService],
      exports: [FirebaseService, FirebaseAdminService],
    };
  }
}
