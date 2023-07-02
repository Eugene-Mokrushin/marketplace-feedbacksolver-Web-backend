import { Body, Controller, Post } from '@nestjs/common';
import { InterfaceService } from './interface.service';
import { NewMarketplaceDto } from './interfaceDto';

@Controller('interface')
export class InterfaceController {
  constructor(private interfaceService: InterfaceService) {}

  @Post('addMarketplace')
  addMarketplace(@Body() dto: NewMarketplaceDto) {
    return this.interfaceService.addNewMarketplace(dto);
  }
}
