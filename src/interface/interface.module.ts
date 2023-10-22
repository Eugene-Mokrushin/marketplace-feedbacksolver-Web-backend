import { Module } from '@nestjs/common';
import { InterfaceService } from './interface.service';
import { InterfaceController } from './interface.controller';
import { SharedModule } from '@/shared/shared.module';

@Module({
  imports: [SharedModule],
  providers: [InterfaceService],
  controllers: [InterfaceController],
})
export class InterfaceModule {}
