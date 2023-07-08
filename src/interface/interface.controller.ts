import { Body, Controller, Post } from '@nestjs/common';
import { InterfaceService } from './interface.service';
import { AddUserDto, NewKeyPairDto, NewMarketplaceDto } from './interfaceDto';

@Controller('interface')
export class InterfaceController {
  constructor(private interfaceService: InterfaceService) {}

  @Post('addMarketplace')
  addMarketplace(@Body() dto: NewMarketplaceDto) {
    return this.interfaceService.addNewMarketplace(dto);
  }

  @Post('addUserToOragnization')
  addUserToOrganization(@Body() dto: AddUserDto) {
    return this.interfaceService.addUserToOrganization(dto);
  }

  @Post('changeSecretKey')
  changeSecretKey(@Body() dto: NewKeyPairDto) {
    return this.interfaceService.setNewKeyPair(dto);
  }
}
