import { Module } from '@nestjs/common';
import { SharedService } from './shared.service';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [JwtModule],
  providers: [SharedService],
  exports: [SharedService],
})
export class SharedModule {
  static forRoot(): any {
    return {
      module: SharedModule,
      providers: [SharedService],
      exports: [SharedService],
    };
  }
}
